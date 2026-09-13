/* sidecar/pauli-foundry.js — Pauli's foundry: parallel coding-worker pools (agent-orchestrator
   patterns port, chunk 8).

   Port of the parallel-execution patterns from executiveusa/pauli-agent-orchestrator (MIT,
   upstream ComposioHQ/agent-orchestrator @ 4cda4379 - worktree-per-task, branch/PR lifecycle,
   CI repair loop, reviewer-feedback loop, plugin layer). See
   districts/pauli/imports/agent-orchestrator/IMPORT.md. This is the parallel-execution half;
   firstmate's supervisor (sidecar/supervisor.js) is the supervision half. No code copied -
   patterns implemented against injected starnet interfaces.

   WORKTREE-PER-TASK with COLLISION LAW: every worker gets its own worktree path and its own
   branch (foundry/<task-slug>-<seq>). Two workers on one repo NEVER share a path or a branch -
   the pool registry refuses a collision instead of letting one worker clobber another's checkout.

   CI REPAIR LOOP: CI runs through the injected runCi; a red build hands the log to the injected
   repair worker and re-runs, up to maxAttempts. Exhaustion is an honest result, never a silent pass.

   REVIEWER-FEEDBACK LOOP: same shape - the injected reviewer returns comments, the worker
   addresses them, re-review, up to maxAttempts.

   PR GATE: openPr refuses while CI is red. Green CI is the only road to a PR.

   PLUGIN LAYER: named plugins with beforeSpawn / afterCi / afterReview hooks, run in registration
   order; a throwing plugin is isolated and recorded, never crashes the pool.

   All ambient I/O INJECTED (fs, pathMod, clock, idgen, crypto, git, runCi, repair, reviewer).
   State is append-only JSONL under <root>/pauli-foundry/, fail-open. No Date.now / Math.random.

   makePauliFoundry({ fs, pathMod, root, clock, idgen, crypto, git, runCi, repair, reviewer })
     spawn({ repo, task, workerId? })                        -> { ok, worker? | error }
     status(workerId?)                                       -> { ok, workers }
     ciLoop(workerId, { maxAttempts? })                      -> { ok, pass, attempts, history, exhausted? }
     reviewLoop(workerId, { maxAttempts? })                  -> { ok, approved, attempts, history, exhausted? }
     openPr(workerId, { title, body })                       -> { ok, pr? | error }
     complete(workerId)                                      -> { ok }   // releases the worktree
     registerPlugin({ name, hooks })                         -> { ok }
     pluginLog()                                             -> { ok, events } */
'use strict';

function makePauliFoundry(deps) {
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock, idgen = deps.idgen, crypto = deps.crypto;
  const git = deps.git, runCi = deps.runCi, repair = deps.repair, reviewer = deps.reviewer;
  const root = deps.root;
  if (!fs || !pathMod || typeof clock !== 'function' || typeof idgen !== 'function' || !crypto || !root) {
    throw new Error('pauli-foundry: fs, pathMod, root, clock, idgen, crypto are required');
  }
  if (!git || typeof git.addWorktree !== 'function' || typeof git.removeWorktree !== 'function') {
    throw new Error('pauli-foundry: git adapter with addWorktree/removeWorktree is required');
  }
  const dir = pathMod.join(root, 'pauli-foundry');
  const logFile = pathMod.join(dir, 'events.jsonl');
  const poolDir = pathMod.join(dir, 'pool');
  const workers = new Map();  // workerId -> record
  const plugins = [];
  const pluginEvents = [];
  let seq = 0;

  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });
  const slugOf = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'task';

  function append(entry) {
    try { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(logFile, JSON.stringify(entry) + '\n'); return true; } catch (_) { return false; }
  }

  function runHooks(name, payload) {
    for (const p of plugins) {
      const hook = p.hooks && p.hooks[name];
      if (typeof hook !== 'function') continue;
      try { hook(payload); pluginEvents.push({ plugin: p.name, hook: name, at: clock(), ok: true }); }
      catch (e) { pluginEvents.push({ plugin: p.name, hook: name, at: clock(), ok: false, error: (e && e.message) || String(e) }); } // isolated, recorded
    }
  }

  function spawn({ repo, task, workerId }) {
    if (typeof repo !== 'string' || !repo.trim()) return bad('no-repo', 'repo path required');
    if (typeof task !== 'string' || !task.trim()) return bad('no-task', 'task description required');
    const id = workerId || 'worker_' + idgen();
    const existing = workers.get(id);
    if (existing && existing.state !== 'completed') return bad('collision', 'workerId ' + id + ' already holds an active worktree');
    const n = ++seq;
    const branch = 'foundry/' + slugOf(task) + '-' + n;
    for (const w of workers.values()) { // branch collision law, even across workerIds
      if (w.state !== 'completed' && w.repo === repo && w.branch === branch) return bad('collision', 'branch ' + branch + ' is already checked out by ' + w.workerId);
    }
    const worktree = pathMod.join(poolDir, id);
    const res = git.addWorktree({ repo, path: worktree, branch });
    if (!res || res.ok === false) return bad('worktree-failed', 'git refused the worktree: ' + ((res && res.error) || 'unknown'));
    const worker = { workerId: id, repo, task, branch, worktree, state: 'active', ci: 'unknown', attempts: [], reviews: [], pr: null, spawnedAt: clock() };
    workers.set(id, worker);
    append({ op: 'spawn', worker });
    runHooks('beforeSpawn', worker); // informational hooks fire after state is durable
    return ok({ worker });
  }

  function requireActive(workerId) {
    const w = workers.get(String(workerId));
    if (!w) return { error: bad('no-worker', 'unknown worker') };
    if (w.state === 'completed') return { error: bad('worker-completed', 'worker already completed and released') };
    return { w };
  }

  function ciLoop(workerId, { maxAttempts } = {}) {
    const { w, error } = requireActive(workerId); if (error) return error;
    if (typeof runCi !== 'function') return bad('no-ci', 'runCi was not injected');
    if (typeof repair !== 'function') return bad('no-repair', 'repair worker was not injected');
    const cap = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 3;
    const history = [];
    for (let attempt = 1; attempt <= cap; attempt++) {
      const run = runCi({ worktree: w.worktree, branch: w.branch, attempt });
      const pass = !!(run && run.pass);
      history.push({ attempt, pass, log: run && run.log ? String(run.log).slice(0, 500) : '' });
      runHooks('afterCi', { worker: w, attempt, pass });
      if (pass) {
        w.ci = 'green'; w.attempts = history;
        append({ op: 'ci-green', workerId: w.workerId, attempts: history.length });
        return ok({ pass: true, attempts: history.length, history });
      }
      if (attempt < cap) repair({ worktree: w.worktree, branch: w.branch, log: history[history.length - 1].log, attempt });
    }
    w.ci = 'red'; w.attempts = history;
    append({ op: 'ci-exhausted', workerId: w.workerId, attempts: history.length });
    return ok({ pass: false, attempts: history.length, history, exhausted: true });
  }

  function reviewLoop(workerId, { maxAttempts } = {}) {
    const { w, error } = requireActive(workerId); if (error) return error;
    if (typeof reviewer !== 'function') return bad('no-reviewer', 'reviewer was not injected');
    if (typeof repair !== 'function') return bad('no-repair', 'repair worker was not injected');
    const cap = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 3;
    const history = [];
    for (let attempt = 1; attempt <= cap; attempt++) {
      const review = reviewer({ worktree: w.worktree, branch: w.branch, attempt });
      const comments = review && Array.isArray(review.comments) ? review.comments : [];
      history.push({ attempt, comments });
      runHooks('afterReview', { worker: w, attempt, comments: comments.length });
      if (comments.length === 0) {
        w.reviews = history;
        append({ op: 'review-approved', workerId: w.workerId, attempts: history.length });
        return ok({ approved: true, attempts: history.length, history });
      }
      if (attempt < cap) repair({ worktree: w.worktree, branch: w.branch, comments, attempt });
    }
    w.reviews = history;
    append({ op: 'review-exhausted', workerId: w.workerId, attempts: history.length });
    return ok({ approved: false, attempts: history.length, history, exhausted: true });
  }

  function openPr(workerId, { title, body }) {
    const { w, error } = requireActive(workerId); if (error) return error;
    if (w.ci !== 'green') return bad('ci-not-green', 'the PR gate: CI must be green before a PR opens (current: ' + w.ci + ')');
    if (typeof title !== 'string' || !title.trim()) return bad('no-title', 'PR title required');
    const pr = { branch: w.branch, title, body: body || '', state: 'open', openedAt: clock() };
    w.pr = pr;
    append({ op: 'open-pr', workerId: w.workerId, pr });
    return ok({ pr });
  }

  function complete(workerId) {
    const { w, error } = requireActive(workerId); if (error) return error;
    w.state = 'completed';
    git.removeWorktree({ repo: w.repo, path: w.worktree });
    append({ op: 'complete', workerId: w.workerId, at: clock() });
    return ok();
  }

  function status(workerId) {
    if (workerId) {
      const w = workers.get(String(workerId));
      return w ? ok({ workers: [w] }) : bad('no-worker', 'unknown worker');
    }
    return ok({ workers: Array.from(workers.values()) });
  }

  function registerPlugin({ name, hooks }) {
    if (typeof name !== 'string' || !name.trim()) return bad('no-name', 'plugin name required');
    plugins.push({ name, hooks: hooks || {} });
    return ok();
  }

  function pluginLog() { return ok({ events: pluginEvents.slice() }); }

  return { spawn, status, ciLoop, reviewLoop, openPr, complete, registerPlugin, pluginLog };
}

module.exports = { makePauliFoundry };
