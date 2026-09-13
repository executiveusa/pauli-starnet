/* sidecar/supervisor.js — Pauli's supervisor (firstmate patterns port, chunk 1).

   Port of executiveusa/pauli-firstmate's proven supervision patterns (see
   districts/pauli/imports/firstmate/IMPORT.md; MIT, upstream kunchenguid/firstmate @ 0e31b0a0):
   - DISPATCH PROFILES: every task ships under exactly one profile that names its merge authority
     ('no-mistakes' | 'direct-PR' | 'local-only'). Authority comes from the profile, never from vibes.
   - HOLD LIFECYCLE: a blocked worker turns ambiguity into ONE concrete question with options and
     holds; it never silently guesses. Resume requires an explicit answer.
   - DURABLE STATUS: every task is a JSON document on disk, atomically replaced (tmp + rename), so a
     restart loses nothing; reconcile() marks confirmed-dead workers 'stale' instead of inventing state.
   - ZERO-TOKEN WATCHER: poll() reads an append-only event log and hands back only NEW events. The
     watcher sleeps between polls and never involves a model — supervision costs nothing while idle.
   - WORKTREE NAMES: worktreeFor() computes the isolated path + branch for a task; the actual git
     invocation stays in the host (sidecar/index.js owns ambient process I/O).

   Every ambient dependency is INJECTED (fs, pathMod, clock) so it is headless-testable with a real
   temp dir and a fake clock; there is NO Date.now / Math.random / new Date() here (lint-determinism).
   All storage failures FAIL-OPEN to null/false — a supervisor problem must never crash a run.

   makeSupervisor({ fs, pathMod, root, clock })
     clock: () => int ms
     dispatch({ taskId, profile, title, worktree? }) -> { ok, task? , error? }
     hold(taskId, { question, options })            -> { ok, error? }   // working -> held
     resume(taskId, { answer })                     -> { ok, error? }   // held -> working
     complete(taskId, { outcome, evidence? })       -> { ok, error? }   // working -> done
     fail(taskId, { error })                        -> { ok, error? }   // working|held -> failed
     status(taskId) -> task | null        list() -> task[]
     reconcile(aliveTaskIds: string[])    -> { stale: string[] }  // working|held not in alive -> stale
     poll(sinceSeq: int) -> { events: evt[], nextSeq: int }       // zero-token: new events only
     worktreeFor(taskId) -> { path, branch } */
'use strict';

const PROFILES = Object.freeze({
  'no-mistakes': Object.freeze({ id: 'no-mistakes', mergeAuthority: 'captain-approval', prAllowed: true, mergeAllowed: false }),
  'direct-PR': Object.freeze({ id: 'direct-PR', mergeAuthority: 'direct-pr', prAllowed: true, mergeAllowed: true }),
  'local-only': Object.freeze({ id: 'local-only', mergeAuthority: 'local-only', prAllowed: false, mergeAllowed: false })
});

const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const LIVE = new Set(['working', 'held']);

function makeSupervisor(deps) {
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock;
  const root = deps.root;
  if (!fs || !pathMod || typeof clock !== 'function' || !root) throw new Error('supervisor: fs, pathMod, root, clock are required');
  const dir = pathMod.join(root, 'supervisor');
  const tasksDir = pathMod.join(dir, 'tasks');
  const logPath = pathMod.join(dir, 'events.log');

  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });

  function ensureDirs() {
    try { fs.mkdirSync(tasksDir, { recursive: true }); return true; } catch (_) { return false; }
  }

  function taskPath(taskId) { return pathMod.join(tasksDir, taskId + '.json'); }

  function writeTask(task) {
    try {
      ensureDirs();
      const tmp = taskPath(task.id) + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(task, null, 2));
      fs.renameSync(tmp, taskPath(task.id));
      return true;
    } catch (_) { return false; }
  }

  function readTask(taskId) {
    try { return JSON.parse(fs.readFileSync(taskPath(taskId), 'utf8')); } catch (_) { return null; }
  }

  function logLength() {
    try {
      const s = fs.readFileSync(logPath, 'utf8');
      if (!s) return 0;
      return s.endsWith('\n') ? s.split('\n').length - 1 : s.split('\n').length;
    } catch (_) { return 0; }
  }

  function appendEvent(taskId, kind, data) {
    const evt = { seq: logLength() + 1, taskId, kind, at: clock(), data: data || {} };
    try { ensureDirs(); fs.appendFileSync(logPath, JSON.stringify(evt) + '\n'); } catch (_) { /* fail-open: the task record still carries state */ }
    return evt;
  }

  function dispatch(input) {
    const taskId = String((input && input.taskId) || '');
    if (!SLUG.test(taskId)) return bad('BAD_TASK_ID', 'taskId must be a lowercase slug');
    const profile = PROFILES[String((input && input.profile) || '')];
    if (!profile) return bad('BAD_PROFILE', 'profile must be one of: ' + Object.keys(PROFILES).join(', '));
    if (readTask(taskId)) return bad('TASK_EXISTS', 'taskId already dispatched');
    const title = String((input && input.title) || '').trim();
    if (!title) return bad('BAD_TITLE', 'a task needs a title');
    const now = clock();
    const task = {
      id: taskId, title, profile: profile.id, mergeAuthority: profile.mergeAuthority,
      state: 'working', worktree: input.worktree ? String(input.worktree) : null,
      holds: [], answer: null, outcome: null, evidence: null, error: null,
      createdAt: now, updatedAt: now
    };
    if (!writeTask(task)) return bad('STORE_FAILED', 'could not persist task');
    appendEvent(taskId, 'dispatch', { profile: profile.id, title });
    return ok({ task });
  }

  function transition(taskId, fn) {
    if (!SLUG.test(String(taskId || ''))) return bad('BAD_TASK_ID', 'unknown taskId');
    const task = readTask(taskId);
    if (!task) return bad('NO_TASK', 'no such task');
    const res = fn(task);
    if (!res.ok) return res;
    task.updatedAt = clock();
    if (!writeTask(task)) return bad('STORE_FAILED', 'could not persist task');
    appendEvent(taskId, res.event, res.data);
    return ok({ task });
  }

  function hold(taskId, input) {
    return transition(taskId, task => {
      if (task.state !== 'working') return bad('BAD_STATE', 'only a working task can hold');
      const question = String((input && input.question) || '').trim();
      const options = Array.isArray(input && input.options) ? input.options.map(String).map(s => s.trim()).filter(Boolean) : [];
      if (!question) return bad('BAD_HOLD', 'a hold needs one concrete question');
      if (!options.length) return bad('BAD_HOLD', 'a hold needs at least one option - never an open guess');
      task.state = 'held';
      const entry = { question, options, at: clock(), answer: null };
      task.holds.push(entry);
      return { ok: true, event: 'hold', data: { question, options } };
    });
  }

  function resume(taskId, input) {
    return transition(taskId, task => {
      if (task.state !== 'held') return bad('BAD_STATE', 'only a held task can resume');
      const answer = String((input && input.answer) || '').trim();
      if (!answer) return bad('BAD_RESUME', 'resume needs an explicit answer');
      const open = task.holds[task.holds.length - 1];
      if (open) open.answer = answer;
      task.state = 'working';
      return { ok: true, event: 'resume', data: { answer } };
    });
  }

  function complete(taskId, input) {
    return transition(taskId, task => {
      if (task.state !== 'working') return bad('BAD_STATE', 'only a working task can complete');
      const outcome = String((input && input.outcome) || '').trim();
      if (!outcome) return bad('BAD_COMPLETE', 'completion needs an outcome statement');
      task.state = 'done';
      task.outcome = outcome;
      task.evidence = input && input.evidence != null ? String(input.evidence) : null;
      return { ok: true, event: 'complete', data: { outcome } };
    });
  }

  function fail(taskId, input) {
    return transition(taskId, task => {
      if (!LIVE.has(task.state)) return bad('BAD_STATE', 'only a live task can fail');
      task.state = 'failed';
      task.error = String((input && input.error) || 'unknown').trim() || 'unknown';
      return { ok: true, event: 'fail', data: { error: task.error } };
    });
  }

  function status(taskId) {
    if (!SLUG.test(String(taskId || ''))) return null;
    return readTask(taskId);
  }

  function list() {
    try {
      return fs.readdirSync(tasksDir)
        .filter(n => n.endsWith('.json'))
        .map(n => { try { return JSON.parse(fs.readFileSync(pathMod.join(tasksDir, n), 'utf8')); } catch (_) { return null; } })
        .filter(Boolean)
        .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
    } catch (_) { return []; }
  }

  function reconcile(aliveTaskIds) {
    const alive = new Set(Array.isArray(aliveTaskIds) ? aliveTaskIds : []);
    const stale = [];
    for (const task of list()) {
      if (LIVE.has(task.state) && !alive.has(task.id)) {
        task.state = 'stale';
        task.updatedAt = clock();
        if (writeTask(task)) { appendEvent(task.id, 'stale', {}); stale.push(task.id); }
      }
    }
    return { stale };
  }

  function poll(sinceSeq) {
    const from = Number.isInteger(sinceSeq) && sinceSeq > 0 ? sinceSeq : 0;
    let events = [];
    try {
      const lines = fs.readFileSync(logPath, 'utf8').split('\n');
      for (const line of lines) {
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          if (evt && typeof evt.seq === 'number' && evt.seq > from) events.push(evt);
        } catch (_) { /* a torn tail line is ignored, never fatal */ }
      }
    } catch (_) { events = []; }
    const nextSeq = events.length ? events[events.length - 1].seq : from;
    return { events, nextSeq };
  }

  function worktreeFor(taskId) {
    if (!SLUG.test(String(taskId || ''))) return null;
    return { path: pathMod.join(root, 'worktrees', taskId), branch: 'pauli/' + taskId };
  }

  return Object.freeze({ PROFILES, dispatch, hold, resume, complete, fail, status, list, reconcile, poll, worktreeFor });
}

module.exports = { makeSupervisor };
