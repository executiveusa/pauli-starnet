'use strict';
// STARFACTORY-001: the receiving end of Paperclip's `http` adapter. Paperclip POSTs a wake
//   { runId, agentId, companyId, context: { taskId, wakeReason } }
// and this bridge claims the task, runs the existing worker (Hermes / Pi / sidecar), reports the result back
// to Paperclip, and tells Heisenberg to reconcile (that is the automatic agent-to-agent handoff).
//
// A wake is a REQUEST, never an authority. Before any checkout or execution the bridge verifies, against Paperclip:
//   - the task is a factory task (stage title), assigned to THIS worker, in THIS company
//   - the stage fits the worker (review only by QA; build stages never by QA)
//   - the task is in a runnable status: `todo`, or `in_progress` only when this bridge already started it (recovery)
//   - the parent mission is live and authorized (a restricted mission needs the owner's authorization of record,
//     held in the gateway, not just a status in Paperclip)
//
// Safety properties (each one has a test):
//   - a duplicate wake for the same runId never executes twice (receipt keyed by runId)
//   - two DIFFERENT run ids can never execute the same task at once (in-process claim + exclusive lock file)
//   - a task already completed, or interrupted mid-run under a non-idempotent executor, is never executed again
//   - the result is persisted BEFORE it is reported, so a crash between the two never re-runs the work
//   - a crashed run resumes only if its executor declared itself idempotent; otherwise it fails visibly
//   - a paused agent, an emergency stop, or a spent budget stops work before it starts
//   - a failed run is never reported as done
const { parseMissionTitle, parseStageTitle } = require('./planner.js');
const { COMMENT_PREFIX, AUTH_TAG, readSpec } = require('./heisenberg.js');

const SAFE_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const reject = (code, error, detail) => ({ ok: false, code, error, detail: detail || null });

function makeWorkerBridge({ roles, clientFor, executors, store, heisenberg, maxRetries = 2, log = () => {} }) {
  const inflightRuns = new Set();
  const inflightTasks = new Set();
  const byAgent = new Map(Object.entries(roles).filter(([, r]) => r && r.agentId).map(([k, r]) => [r.agentId, k]));

  function readBudget(issue) {
    for (const a of (issue.ancestors || [])) {
      const spec = readSpec(a);
      if (spec) return Number(spec.budget_usd) || 0;
    }
    return 0;
  }
  function missionSpend(mid) {
    return store.allReceipts().filter(r => r.mission === mid && r.workerKey).reduce((s, r) => s + (Number(r.usd) || 0), 0);
  }

  // Everything that must be true about a task before this worker may touch it. Reads Paperclip with the worker's own credential.
  async function validateWake(workerKey, payload, { recovering }) {
    const taskId = payload.context.taskId;
    const agentId = roles[workerKey].agentId;
    const client = clientFor(workerKey);
    let issue;
    try { issue = await client.getIssue(taskId); }
    catch (e) { return e.status === 404 ? reject(404, 'TASK_NOT_FOUND') : reject(502, 'TASK_LOOKUP_FAILED', e.message); }
    if (!issue) return reject(404, 'TASK_NOT_FOUND');
    const stage = parseStageTitle(issue.title);
    if (!stage) return reject(403, 'NOT_A_FACTORY_TASK');
    if (issue.companyId && issue.companyId !== client.companyId) return reject(403, 'COMPANY_MISMATCH');
    if (issue.assigneeAgentId !== agentId) return reject(403, 'NOT_ASSIGNED_TO_WORKER');
    const isReview = stage.stage === 'review';
    if (isReview ? workerKey !== 'qa' : (workerKey === 'qa' || workerKey === 'heisenberg')) return reject(403, 'STAGE_WORKER_MISMATCH', stage.stage + ' task for worker ' + workerKey);
    const runnable = recovering ? ['in_progress'] : ['todo'];
    if (!runnable.includes(issue.status)) return reject(409, 'TASK_NOT_RUNNABLE', 'status is ' + issue.status);

    // The parent mission must exist, be live, and be authorized.
    const parentId = issue.parentId || (issue.ancestors && issue.ancestors[0] && issue.ancestors[0].id);
    if (!parentId) return reject(403, 'MISSION_NOT_AUTHORIZED', 'task has no parent mission');
    let parent;
    try { parent = await client.getIssue(parentId); } catch (e) { return reject(502, 'MISSION_LOOKUP_FAILED', e.message); }
    if (!parent || parseMissionTitle(parent.title) !== stage.mission) return reject(403, 'MISSION_NOT_AUTHORIZED', 'parent is not mission ' + stage.mission);
    if (parent.companyId && parent.companyId !== client.companyId) return reject(403, 'COMPANY_MISMATCH');
    if (!['todo', 'in_progress'].includes(parent.status) || String(parent.title).includes(AUTH_TAG)) return reject(403, 'MISSION_NOT_AUTHORIZED', 'mission status is ' + parent.status);
    const spec = readSpec(parent);
    if (spec && Array.isArray(spec.restricted) && spec.restricted.length) {
      const auth = store.getReceipt('auth:' + stage.mission);
      if (!auth || auth.phase !== 'authorized') return reject(403, 'MISSION_NOT_AUTHORIZED', 'restricted permissions have no owner authorization of record');
    }
    return { ok: true, issue, stage, mission: stage.mission, recovering };
  }

  // Validates and admits a wake. Returns { code, body, done }; `done` resolves when the async work finishes.
  async function admit(workerKey, payload, { recovery = false } = {}) {
    if (!roles[workerKey] || !roles[workerKey].agentId) return { code: 404, body: { error: 'UNKNOWN_WORKER' } };
    if (!payload || !SAFE_ID.test(String(payload.runId || '')) || !payload.context || !SAFE_ID.test(String(payload.context.taskId || ''))) {
      return { code: 400, body: { error: 'runId and context.taskId are required' } };
    }
    if (payload.agentId !== roles[workerKey].agentId) return { code: 403, body: { error: 'AGENT_MISMATCH' } };
    const client = clientFor(workerKey);
    if (!client) return { code: 403, body: { error: 'NO_WORKER_CREDENTIAL', detail: 'worker ' + workerKey + ' has no credential of its own' } };
    if (payload.companyId !== undefined && payload.companyId !== client.companyId) return { code: 403, body: { error: 'COMPANY_MISMATCH' } };
    if (store.isStopped()) return { code: 503, body: { error: 'FACTORY_STOPPED', info: store.stopInfo() } };

    const { runId } = payload;
    const taskId = payload.context.taskId;
    const prior = store.getReceipt(runId);
    if (prior && prior.phase === 'reported') return { code: 200, body: { duplicate: true, runId, status: prior.status } };
    if (inflightRuns.has(runId)) return { code: 200, body: { duplicate: true, runId, status: 'in_flight' } };
    if (inflightTasks.has(taskId)) return { code: 409, body: { error: 'TASK_IN_FLIGHT', detail: 'another run is executing this task' } };

    // Claim in-process BEFORE any await, so two concurrent wakes cannot both pass the checks below.
    inflightRuns.add(runId); inflightTasks.add(taskId);
    let launched = false;
    try {
      const taskRec = store.getReceipt('task:' + taskId);
      // The bridge itself started (or finished executing) this task earlier: the only case in which `in_progress` is acceptable.
      const recovering = recovery || !!(taskRec && (taskRec.phase === 'started' || taskRec.phase === 'executed'));
      const v = await validateWake(workerKey, payload, { recovering });
      if (!v.ok) return { code: v.code, body: { error: v.error, detail: v.detail } };

      if (taskRec && taskRec.runId !== runId) {
        if (taskRec.phase === 'reported' && taskRec.status === 'completed') return { code: 200, body: { duplicate: true, error: 'TASK_ALREADY_COMPLETED', runId } };
        if (taskRec.phase === 'started') {
          const ex = executors[workerKey];
          if (!ex || ex.idempotent !== true) return { code: 409, body: { error: 'TASK_RUN_UNRESOLVED', detail: 'an earlier run started this task and is not known to be safe to repeat' } };
        }
      }
      const lock = store.acquireTaskLock(taskId, runId);
      if (!lock.ok) return { code: 409, body: { error: 'TASK_LOCKED', detail: 'another run holds this task' } };
      launched = true;
      const done = run(workerKey, payload, v).catch((e) => { log('bridge_run_error', { runId, taskId, error: e && e.message }); });
      return { code: 202, body: { accepted: true, runId }, done };
    } finally {
      if (!launched) { inflightRuns.delete(runId); inflightTasks.delete(taskId); }
    }
  }

  async function run(workerKey, payload, v) {
    const { runId } = payload;
    const taskId = payload.context.taskId;
    const client = clientFor(workerKey);
    const agentId = roles[workerKey].agentId;
    try {
      const prev = store.getCheckpoint(taskId);
      const retry = prev && (prev.phase === 'running' || prev.phase === 'failed') ? (prev.retry || 0) + 1 : 0;

      // A result was already executed for this task (by this run or an earlier one)? Only the reporting step is left. Never re-execute.
      const taskRec = store.getReceipt('task:' + taskId);
      if (taskRec && taskRec.phase === 'executed') {
        const r = store.getReceipt(taskRec.runId);
        if (r && r.phase === 'executed') return await report(workerKey, client, taskRec.runId, taskId, r, payload);
      }

      // Defenses before any work.
      let agent = null;
      try { agent = await client.getAgent(agentId); } catch (e) { return fail(client, runId, taskId, workerKey, 'could not read agent state: ' + e.message, payload, retry); }
      if (agent && (agent.status === 'paused' || agent.status === 'terminated')) {
        store.putCheckpoint(taskId, { phase: 'skipped', reason: 'agent ' + agent.status, runId, agentId, workerKey, retry });
        return { skipped: 'agent ' + agent.status };
      }
      store.putCheckpoint(taskId, { phase: 'running', runId, agentId, workerKey, mission: v.mission, retry, payload, startedAt: new Date().toISOString() });

      // Claim. `todo` normally; `in_progress` only when recovering a run this bridge started. Never blocked/backlog/in_review.
      try { await client.checkout(taskId, { agentId, expectedStatuses: v.recovering ? ['in_progress'] : ['todo'] }, runId); } catch (e) {
        if (e.status === 409) { store.putCheckpoint(taskId, { phase: 'skipped', reason: 'claimed elsewhere', runId, agentId, workerKey, retry }); return { skipped: 'conflict' }; }
        return fail(client, runId, taskId, workerKey, 'checkout failed: ' + e.message, payload, retry);
      }
      const issue = await client.getIssue(taskId);
      const mission = v.mission;
      const role = v.stage.stage === 'review' ? 'qa' : workerKey;

      // Budget gate.
      const cap = readBudget(issue);
      if (cap > 0 && missionSpend(mission) >= cap) {
        await client.patchIssue(taskId, { status: 'blocked', comment: 'Mission budget cap of $' + cap + ' reached; no further work started.' }, runId);
        store.putCheckpoint(taskId, { phase: 'blocked', reason: 'budget', runId, agentId, workerKey, mission, retry });
        store.putReceipt(runId, { phase: 'reported', status: 'blocked_budget', taskId, workerKey, mission, usd: 0 });
        return { blocked: 'budget' };
      }

      // Execute.
      const executor = executors[workerKey];
      if (!executor) return fail(client, runId, taskId, workerKey, 'no executor configured for ' + workerKey, payload, retry);
      store.putReceipt('task:' + taskId, { phase: 'started', runId, workerKey, mission });
      let result;
      try { result = await executor.run({ issue, role, mission, runId, checkpoint: prev || null }); }
      catch (e) { result = { ok: false, summary: 'executor error: ' + (e && e.message), artifacts: [], usd: 0 }; }
      if (!result || !result.ok) return fail(client, runId, taskId, workerKey, (result && result.summary) || 'executor failed', payload, retry, result);

      // Persist BEFORE reporting.
      const rec = store.putReceipt(runId, { phase: 'executed', status: 'completed', taskId, workerKey, mission, role, summary: result.summary, artifacts: result.artifacts || [], usd: Number(result.usd) || 0, verdict: result.verdict || null, findings: result.findings || [] });
      store.putReceipt('task:' + taskId, { phase: 'executed', runId, workerKey, mission });
      return await report(workerKey, client, runId, taskId, rec, payload);
    } finally {
      inflightRuns.delete(runId); inflightTasks.delete(taskId);
      store.releaseTaskLock(taskId, runId);
    }
  }

  async function report(workerKey, client, runId, taskId, rec, payload) {
    if (rec.role === 'qa') {
      const v = rec.verdict === 'PASS' || rec.verdict === 'FAIL' ? rec.verdict : null;
      if (!v) return fail(client, runId, taskId, workerKey, 'reviewer produced no verdict', payload, 0);
      // Posted with the QA agent's OWN credential, so Paperclip records who wrote it. Heisenberg checks the author.
      await client.addComment(taskId, { body: COMMENT_PREFIX + ' ' + JSON.stringify({ verdict: v, findings: rec.findings || [], runId }) }, runId);
    }
    await client.patchIssue(taskId, { status: 'done', comment: (rec.summary || 'completed') + (rec.artifacts && rec.artifacts.length ? '\n\nArtifacts: ' + rec.artifacts.map(a => a.ref || a.url || JSON.stringify(a)).join(', ') : '') }, runId);
    store.putReceipt(runId, Object.assign({}, rec, { phase: 'reported' }));
    store.putReceipt('task:' + taskId, { phase: 'reported', status: 'completed', runId, workerKey, mission: rec.mission });
    store.putCheckpoint(taskId, { phase: 'completed', runId, agentId: roles[workerKey].agentId, workerKey, mission: rec.mission, retry: (store.getCheckpoint(taskId) || {}).retry || 0 });
    log('completed', { runId, taskId, workerKey });
    // The automatic handoff: Heisenberg reads Paperclip and creates the next task if the plan says so.
    let next = null;
    try { next = await heisenberg.reconcile(rec.mission); } catch (e) { log('reconcile_failed', { mission: rec.mission, error: e.message }); }
    return { completed: true, next };
  }

  async function fail(client, runId, taskId, workerKey, reason, payload, retry, result) {
    try { await client.patchIssue(taskId, { status: 'blocked', comment: 'Worker run failed: ' + reason }, runId); } catch (e) { log('fail_report_error', { error: e.message }); }
    store.putReceipt(runId, { phase: 'reported', status: 'failed', taskId, workerKey, usd: Number(result && result.usd) || 0, summary: reason });
    store.putReceipt('task:' + taskId, { phase: 'reported', status: 'failed', runId, workerKey });
    store.putCheckpoint(taskId, { phase: 'failed', reason, runId, agentId: roles[workerKey].agentId, workerKey, retry, payload });
    return { failed: reason };
  }

  // On boot: finish what a crash interrupted. Resume only when it is provably safe; otherwise fail visibly.
  async function recover() {
    const results = [];
    for (const cp of store.allCheckpoints()) {
      if (cp.phase !== 'running' || !cp.runId) continue;
      const workerKey = cp.workerKey;
      const client = clientFor(workerKey);
      if (!client) { results.push({ taskId: cp.taskId, action: 'skipped-no-credential' }); continue; }
      const receipt = store.getReceipt(cp.runId);
      const executedAlready = receipt && receipt.phase === 'executed';
      const ex = executors[workerKey];
      const mayResume = executedAlready || (ex && ex.idempotent === true && (cp.retry || 0) < maxRetries && cp.payload);
      if (!mayResume) {
        await fail(client, cp.runId, cp.taskId, workerKey, 'interrupted by a restart and not safe to resume automatically (executor not idempotent or retry budget spent)', cp.payload, cp.retry || 0);
        store.releaseTaskLock(cp.taskId, cp.runId);
        results.push({ taskId: cp.taskId, action: 'failed-visibly' });
        continue;
      }
      const r = await admit(workerKey, cp.payload, { recovery: true });
      if (r.done) { results.push({ taskId: cp.taskId, action: executedAlready ? 'finish-report' : 'resume', out: await r.done }); continue; }
      // Recovery was refused (task no longer valid, mission cancelled, ...): fail visibly instead of executing.
      await fail(client, cp.runId, cp.taskId, workerKey, 'recovery refused: ' + ((r.body && r.body.error) || 'unknown'), cp.payload, cp.retry || 0);
      results.push({ taskId: cp.taskId, action: 'recovery-refused', error: r.body && r.body.error });
    }
    return results;
  }

  return { accept: (workerKey, payload) => admit(workerKey, payload), recover, roleOfAgent: (id) => byAgent.get(id) || null };
}

module.exports = { makeWorkerBridge };
