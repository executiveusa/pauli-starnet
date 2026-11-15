'use strict';
// STARFACTORY-001: the receiving end of Paperclip's `http` adapter. Paperclip POSTs a wake
//   { runId, agentId, companyId, context: { taskId, wakeReason } }
// and this bridge claims the task, runs the existing worker (Hermes / Pi / sidecar), reports the result back
// to Paperclip, and tells Heisenberg to reconcile (that is the automatic agent-to-agent handoff).
//
// Safety properties (each one has a test):
//   - a duplicate wake for the same runId never executes twice (receipt keyed by runId)
//   - the result is persisted BEFORE it is reported, so a crash between the two never re-runs the work
//   - a crashed run resumes only if its executor declared itself idempotent; otherwise it fails visibly
//   - a paused agent, an emergency stop, or a spent budget stops work before it starts
//   - a failed run is never reported as done
const { parseMissionTitle, parseStageTitle } = require('./planner.js');
const { COMMENT_PREFIX } = require('./heisenberg.js');

const SAFE_ID = /^[A-Za-z0-9_.:-]{1,160}$/;

function makeWorkerBridge({ roles, clientFor, executors, store, heisenberg, maxRetries = 2, log = () => {} }) {
  const inflight = new Set();
  const byAgent = new Map(Object.entries(roles).filter(([, r]) => r && r.agentId).map(([k, r]) => [r.agentId, k]));

  function readBudget(issue) {
    for (const a of (issue.ancestors || [])) {
      const m = /```starfactory-spec\n([\s\S]*?)\n```/.exec(String(a.description || ''));
      if (m) { try { return Number(JSON.parse(m[1]).budget_usd) || 0; } catch { /* no cap */ } }
    }
    return 0;
  }
  function missionSpend(mid) {
    return store.allReceipts().filter(r => r.mission === mid).reduce((s, r) => s + (Number(r.usd) || 0), 0);
  }

  // Validates and accepts the wake. Returns { code, body, done } where `done` resolves when the async work finishes.
  function accept(workerKey, payload) {
    if (!roles[workerKey] || !roles[workerKey].agentId) return { code: 404, body: { error: 'UNKNOWN_WORKER' } };
    if (!payload || !SAFE_ID.test(String(payload.runId || '')) || !payload.context || !SAFE_ID.test(String(payload.context.taskId || ''))) {
      return { code: 400, body: { error: 'runId and context.taskId are required' } };
    }
    if (payload.agentId !== roles[workerKey].agentId) return { code: 403, body: { error: 'AGENT_MISMATCH' } };
    if (store.isStopped()) return { code: 503, body: { error: 'FACTORY_STOPPED', info: store.stopInfo() } };
    const prior = store.getReceipt(payload.runId);
    if (prior && prior.phase === 'reported') return { code: 200, body: { duplicate: true, runId: payload.runId, status: prior.status } };
    if (inflight.has(payload.runId)) return { code: 200, body: { duplicate: true, runId: payload.runId, status: 'in_flight' } };
    const done = process_(workerKey, payload);
    return { code: 202, body: { accepted: true, runId: payload.runId }, done };
  }

  async function process_(workerKey, payload) {
    const { runId } = payload;
    const taskId = payload.context.taskId;
    inflight.add(runId);
    const client = clientFor(workerKey);
    const agentId = roles[workerKey].agentId;
    try {
      const prev = store.getCheckpoint(taskId);
      const retry = prev && prev.phase === 'running' ? (prev.retry || 0) + 1 : (prev && prev.phase === 'failed' ? (prev.retry || 0) + 1 : 0);

      // A result already executed for this run? Only the reporting step is left: never re-execute.
      const receipt = store.getReceipt(runId);
      if (receipt && receipt.phase === 'executed') return await report(workerKey, client, runId, taskId, receipt, payload);

      // 1) defenses before any work
      let agent = null;
      try { agent = await client.getAgent(agentId); } catch (e) { return fail(client, runId, taskId, workerKey, null, 'could not read agent state: ' + e.message, payload, retry); }
      if (agent && (agent.status === 'paused' || agent.status === 'terminated')) {
        store.putCheckpoint(taskId, { phase: 'skipped', reason: 'agent ' + agent.status, runId, agentId, workerKey, retry });
        return { skipped: 'agent ' + agent.status };
      }
      const runningCp = { phase: 'running', runId, agentId, workerKey, retry, payload, startedAt: new Date().toISOString() };
      store.putCheckpoint(taskId, runningCp);

      // 2) claim (re-claim is allowed only when this task has a checkpoint from a crashed run)
      const expected = ['todo', 'backlog', 'blocked', 'in_review'].concat(prev && prev.phase === 'running' ? ['in_progress'] : []);
      try { await client.checkout(taskId, { agentId, expectedStatuses: expected }, runId); } catch (e) {
        if (e.status === 409) { store.putCheckpoint(taskId, { phase: 'skipped', reason: 'claimed elsewhere', runId, agentId, workerKey, retry }); return { skipped: 'conflict' }; }
        return fail(client, runId, taskId, workerKey, null, 'checkout failed: ' + e.message, payload, retry);
      }
      const issue = await client.getIssue(taskId);
      const stage = parseStageTitle(issue.title);
      const mission = stage ? stage.mission : parseMissionTitle(issue.title);
      const role = stage ? (stage.stage === 'review' ? 'qa' : workerKey) : workerKey;
      // Record the mission on the running checkpoint as soon as it is known, so a crash that is
      // later failed-visibly in recover() can still attribute its spend to the right mission.
      if (mission && mission !== runningCp.mission) store.putCheckpoint(taskId, Object.assign({}, runningCp, { mission }));

      // 3) budget gate
      const cap = readBudget(issue);
      if (cap > 0 && missionSpend(mission) >= cap) {
        await client.patchIssue(taskId, { status: 'blocked', comment: 'Mission budget cap of $' + cap + ' reached; no further work started.' }, runId);
        store.putCheckpoint(taskId, { phase: 'blocked', reason: 'budget', runId, agentId, workerKey, mission, retry });
        store.putReceipt(runId, { phase: 'reported', status: 'blocked_budget', taskId, workerKey, mission, usd: 0 });
        return { blocked: 'budget' };
      }

      // 4) execute
      const executor = executors[workerKey];
      if (!executor) return fail(client, runId, taskId, workerKey, mission, 'no executor configured for ' + workerKey, payload, retry);
      let result;
      try { result = await executor.run({ issue, role, mission, runId, checkpoint: prev || null }); }
      catch (e) { result = { ok: false, summary: 'executor error: ' + (e && e.message), artifacts: [], usd: 0 }; }
      if (!result || !result.ok) return fail(client, runId, taskId, workerKey, mission, (result && result.summary) || 'executor failed', payload, retry, result);

      // 5) persist BEFORE reporting
      const rec = store.putReceipt(runId, { phase: 'executed', status: 'completed', taskId, workerKey, mission, role, summary: result.summary, artifacts: result.artifacts || [], usd: Number(result.usd) || 0, verdict: result.verdict || null, findings: result.findings || [] });
      return await report(workerKey, client, runId, taskId, rec, payload);
    } finally { inflight.delete(runId); }
  }

  async function report(workerKey, client, runId, taskId, rec, payload) {
    if (rec.role === 'qa') {
      const v = rec.verdict === 'PASS' || rec.verdict === 'FAIL' ? rec.verdict : null;
      if (!v) return fail(client, runId, taskId, workerKey, rec.mission, 'reviewer produced no verdict', payload, 0);
      // Posted with the QA agent's OWN credential, so Paperclip records who wrote it. Heisenberg checks the author.
      await client.addComment(taskId, { body: COMMENT_PREFIX + ' ' + JSON.stringify({ verdict: v, findings: rec.findings || [], runId }) }, runId);
    }
    await client.patchIssue(taskId, { status: 'done', comment: (rec.summary || 'completed') + (rec.artifacts && rec.artifacts.length ? '\n\nArtifacts: ' + rec.artifacts.map(a => a.ref || a.url || JSON.stringify(a)).join(', ') : '') }, runId);
    store.putReceipt(runId, Object.assign({}, rec, { phase: 'reported' }));
    store.putCheckpoint(taskId, { phase: 'completed', runId, agentId: roles[workerKey].agentId, workerKey, mission: rec.mission, retry: (store.getCheckpoint(taskId) || {}).retry || 0 });
    log('completed', { runId, taskId, workerKey });
    // The automatic handoff: Heisenberg reads Paperclip and creates the next task if the plan says so.
    let next = null;
    try { next = await heisenberg.reconcile(rec.mission); } catch (e) { log('reconcile_failed', { mission: rec.mission, error: e.message }); }
    return { completed: true, next };
  }

  // `mission` is recorded on the failed receipt as well as on success: missionSpend() sums every
  // receipt whose mission matches, so a run that spent money before failing must be attributed or
  // its cost escapes the budget gate (re-queuing a blocked task could spend indefinitely).
  // Callers that fail before the mission is parsed pass null.
  async function fail(client, runId, taskId, workerKey, mission, reason, payload, retry, result) {
    try { await client.patchIssue(taskId, { status: 'blocked', comment: 'Worker run failed: ' + reason }, runId); } catch (e) { log('fail_report_error', { error: e.message }); }
    store.putReceipt(runId, { phase: 'reported', status: 'failed', taskId, workerKey, mission: mission || null, usd: Number(result && result.usd) || 0, summary: reason });
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
      const receipt = store.getReceipt(cp.runId);
      if (receipt && receipt.phase === 'executed') {
        results.push({ taskId: cp.taskId, action: 'finish-report', out: await process_(workerKey, cp.payload) });
        continue;
      }
      const ex = executors[workerKey];
      if (ex && ex.idempotent === true && (cp.retry || 0) < maxRetries && cp.payload) {
        results.push({ taskId: cp.taskId, action: 'resume', out: await process_(workerKey, cp.payload) });
      } else {
        await fail(client, cp.runId, cp.taskId, workerKey, cp.mission || null, 'interrupted by a restart and not safe to resume automatically (executor not idempotent or retry budget spent)', cp.payload, cp.retry || 0);
        results.push({ taskId: cp.taskId, action: 'failed-visibly' });
      }
    }
    return results;
  }

  return { accept, recover, roleOfAgent: (id) => byAgent.get(id) || null };
}

module.exports = { makeWorkerBridge };
