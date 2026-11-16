'use strict';
// STARFACTORY-001: Heisenberg, the foreman (one-system D2; Instinct is Chief of Staff). A thin adapter: every mission, task, dependency and
// approval lives in Paperclip. Heisenberg keeps NO mission database - he reads Paperclip, decides with
// the pure planner, and writes the result back. A restart loses nothing because nothing is held here.
const { planNext, missionTitle, stageTitle, parseMissionTitle, parseStageTitle } = require('./planner.js');

const MISSION_ID_RE = /^[A-Za-z0-9_.-]{1,100}$/;
// What a mission may do WITHOUT a fresh owner decision. Everything else parks for the owner.
const AUTONOMOUS_PERMISSIONS = new Set(['read', 'research', 'web.read', 'repo.edit', 'pr.create', 'delegate']);
const COMMENT_PREFIX = 'starfactory-verdict:';
const AUTH_TAG = '(authorization required)';

function restrictedOf(permissions) {
  if (!Array.isArray(permissions) || !permissions.length || !permissions.every(p => typeof p === 'string')) return null; // undeclared: fail closed
  return permissions.filter(p => !AUTONOMOUS_PERMISSIONS.has(p));
}

// The mission ISSUE title is shortened by missionTitle() to 100 chars for display and for the
// stage-title round-trip, so it must never be the source of worker instructions. The full intent
// and the machine-readable spec (acceptance_criteria, repositories, budget_usd) are written into
// the mission issue's description at submitMission time. Read them back from there.
function missionSpec(m) {
  const desc = String((m && m.description) || '');
  const found = /```starfactory-spec\n([\s\S]*?)\n```/.exec(desc);
  let spec = null;
  if (found) { try { spec = JSON.parse(found[1]); } catch { spec = null; } }
  const plain = desc.split('```starfactory-spec')[0].trim();
  const intent = plain || String((m && m.title) || '').replace(/^\[sf:[^\]]+\]\s*/, '');
  return { intent, spec };
}

// Rendered once and appended to every stage body so no worker has to guess the contract.
function specBrief(spec) {
  if (!spec) return '';
  const ac = Array.isArray(spec.acceptance_criteria) && spec.acceptance_criteria.length
    ? spec.acceptance_criteria.map(c => '- ' + c).join('\n') : '(none given)';
  const repos = Array.isArray(spec.repositories) && spec.repositories.length
    ? spec.repositories.join(', ') : '(none given)';
  return '\n\nAcceptance criteria:\n' + ac + '\nRepositories: ' + repos;
}

function authorOf(c) { return c && (c.authorAgentId || (c.author && c.author.agentId) || c.agentId || null); }

function parseVerdict(comments) {
  // Latest well-formed verdict comment wins.
  for (const c of [...(comments || [])].reverse()) {
    const body = String((c && c.body) || '');
    const i = body.indexOf(COMMENT_PREFIX);
    if (i < 0) continue;
    try {
      const v = JSON.parse(body.slice(i + COMMENT_PREFIX.length).trim());
      return { verdict: v.verdict, findings: v.findings || [], authorAgentId: authorOf(c) };
    } catch { /* keep looking */ }
  }
  return null;
}

function makeHeisenberg({ client, roles, store, maxRepairs = 2, log = () => {} }) {
  if (!roles || !roles.heisenberg || !roles.pi || !roles.qa) throw new Error('roles heisenberg, pi and qa are required');
  const locks = new Set();

  async function findMissionIssue(mid) {
    const rows = await client.listIssues({ view: 'index' });
    const list = Array.isArray(rows) ? rows : (rows && (rows.issues || rows.items)) || [];
    return list.find(i => parseMissionTitle(i.title) === mid) || null;
  }
  async function childrenOf(parent) {
    const rows = await client.listIssues({ view: 'index', parentIds: parent.id });
    const list = Array.isArray(rows) ? rows : (rows && (rows.issues || rows.items)) || [];
    return list.filter(i => (i.parentId === parent.id || i.parentId === undefined) && parseStageTitle(i.title));
  }
  async function verdictsFor(children) {
    const out = {};
    for (const c of children) {
      if (parseStageTitle(c.title).stage !== 'review' || c.status !== 'done') continue;
      const v = parseVerdict(await client.listComments(c.id));
      if (v) out[c.id] = v;
    }
    return out;
  }

  async function submitMission(env) {
    if (!env || typeof env !== 'object') return { code: 400, body: { error: 'body must be a mission' } };
    const mid = String(env.mission_id || '');
    if (!MISSION_ID_RE.test(mid)) return { code: 400, body: { error: 'mission_id is required ([A-Za-z0-9_.-], <= 100)' } };
    if (typeof env.user_intent !== 'string' || !env.user_intent.trim() || env.user_intent.length > 8000) return { code: 400, body: { error: 'user_intent is required (<= 8000 chars)' } };
    const existing = await findMissionIssue(mid);
    if (existing) return { code: 200, body: { mission_id: mid, issueId: existing.id, status: existing.status, duplicate: true } };

    const restricted = restrictedOf(env.permissions);
    const needsApproval = restricted === null || restricted.length > 0;
    const spec = {
      v: 1, mission_id: mid, owner: env.owner || 'owner', project_id: env.project_id || null, repositories: env.repositories || [],
      acceptance_criteria: env.acceptance_criteria || [], budget_usd: Number(env.budget_usd) || 0, priority: env.priority || 'medium',
      permissions: Array.isArray(env.permissions) ? env.permissions : null, restricted: restricted === null ? ['undeclared'] : restricted,
      max_repairs: maxRepairs
    };
    const issue = await client.createIssue({
      title: missionTitle(mid, (needsApproval ? AUTH_TAG + ' ' : '') + env.user_intent),
      description: env.user_intent + '\n\n```starfactory-spec\n' + JSON.stringify(spec, null, 2) + '\n```',
      status: needsApproval ? 'blocked' : 'todo',
      priority: spec.priority,
      assigneeAgentId: roles.heisenberg.agentId,
      projectId: spec.project_id || undefined
    });
    if (needsApproval) {
      await client.addComment(issue.id, { body: 'Parked for the owner. Authorization is required for: ' + spec.restricted.join(', ') + '. No worker task has been created.' });
      return { code: 202, body: { mission_id: mid, issueId: issue.id, status: 'blocked', needs_authorization: spec.restricted } };
    }
    const r = await reconcile(mid);
    return { code: 202, body: { mission_id: mid, issueId: issue.id, status: 'todo', next: r } };
  }

  // Owner-only (the route layer enforces the owner token). Must name EXACTLY the restricted scope on record.
  async function authorize(mid, { permissions, approver }) {
    const m = await findMissionIssue(mid);
    if (!m) return { code: 404, body: { error: 'MISSION_NOT_FOUND' } };
    const full = await client.getIssue(m.id);
    const spec = readSpec(full);
    const want = (spec && spec.restricted) || [];
    const got = Array.isArray(permissions) ? [...permissions].sort() : [];
    if (!want.length) return { code: 409, body: { error: 'NOTHING_TO_AUTHORIZE' } };
    if (JSON.stringify(got) !== JSON.stringify([...want].sort())) return { code: 409, body: { error: 'SCOPE_MISMATCH', required: want } };
    if (want.includes('undeclared')) return { code: 409, body: { error: 'DECLARE_PERMISSIONS_FIRST' } };
    await client.addComment(m.id, { body: 'Owner authorized exactly: ' + want.join(', ') + ' (by ' + (approver || 'owner') + ').' });
    await client.patchIssue(m.id, { status: 'todo', title: String(m.title).replace(AUTH_TAG + ' ', '') });
    const r = await reconcile(mid);
    return { code: 200, body: { mission_id: mid, authorized: want, next: r } };
  }

  function readSpec(issue) {
    const m = /```starfactory-spec\n([\s\S]*?)\n```/.exec(String((issue && issue.description) || ''));
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch { return null; }
  }

  async function reconcile(mid) {
    if (locks.has(mid)) return { type: 'busy' };
    locks.add(mid);
    try {
      if (store && store.isStopped()) return { type: 'stopped' };
      const m = await findMissionIssue(mid);
      if (!m) return { type: 'unknown_mission' };
      if (m.status === 'done' || m.status === 'cancelled') return { type: 'closed', status: m.status };
      if (m.status === 'blocked') return { type: 'blocked' };
      const children = await childrenOf(m);
      const verdicts = await verdictsFor(children);
      const plan = planNext({ children, verdicts, qaAgentId: roles.qa.agentId, maxRepairs });
      if (plan.type === 'create') {
        // Re-read right before writing: two reconcilers must never create the same stage twice.
        const fresh = await childrenOf(m);
        if (fresh.some(c => { const p = parseStageTitle(c.title); return p && p.seq === plan.seq; })) return { type: 'wait', on: 'concurrent-create' };
        const agentId = roles[plan.role].agentId;
        // Full intent + spec from the description, never the 100-char title.
        const { intent, spec } = missionSpec(m);
        const brief = specBrief(spec);
        const body = (plan.stage === 'review'
          ? 'Independently review the previous stage for mission ' + mid + '. Record a verdict comment: ' + COMMENT_PREFIX + ' {"verdict":"PASS|FAIL","findings":[...]}. You must not be the builder.\n\nOriginal request: ' + intent
          : plan.stage === 'repair'
            ? 'Repair the defects the independent reviewer found for mission ' + mid + ':\n' + (plan.findings || []).map(f => '- ' + f).join('\n') + '\n\nOriginal request: ' + intent
            : 'Implement mission ' + mid + ' on an isolated branch. Do not merge or deploy.\n\nOriginal request: ' + intent) + brief;
        const child = await client.createIssue({
          title: stageTitle(mid, plan.stage, plan.seq, plan.stage + ': ' + intent.slice(0, 60)),
          description: body, status: 'todo', priority: m.priority || 'medium', parentId: m.id, assigneeAgentId: agentId
        });
        log('handoff', { mission: mid, stage: plan.stage, seq: plan.seq, to: plan.role, issueId: child.id });
        return Object.assign({}, plan, { issueId: child.id });
      }
      if (plan.type === 'await_acceptance') {
        if (m.status !== 'in_review') {
          await client.patchIssue(m.id, { status: 'in_review', comment: 'Independent QA passed. Holding for owner acceptance; nothing is merged or deployed.' });
        }
        return plan;
      }
      if (plan.type === 'escalate') {
        if (m.status !== 'blocked') await client.patchIssue(m.id, { status: 'blocked', comment: 'Escalated to the owner: ' + plan.reason });
        return plan;
      }
      return plan;
    } finally { locks.delete(mid); }
  }

  // The owner's final acceptance. Refused unless an independent PASS from the QA agent is on record.
  async function accept(mid, { approver }) {
    const m = await findMissionIssue(mid);
    if (!m) return { code: 404, body: { error: 'MISSION_NOT_FOUND' } };
    const children = await childrenOf(m);
    const plan = planNext({ children, verdicts: await verdictsFor(children), qaAgentId: roles.qa.agentId, maxRepairs });
    if (plan.type !== 'await_acceptance') return { code: 409, body: { error: 'NO_INDEPENDENT_PASS', state: plan.type } };
    await client.patchIssue(m.id, { status: 'done', comment: 'Accepted by ' + (approver || 'owner') + ' after independent QA PASS (' + plan.reviewId + ').' });
    return { code: 200, body: { mission_id: mid, status: 'done' } };
  }

  async function status(mid) {
    const m = await findMissionIssue(mid);
    if (!m) return null;
    const children = await childrenOf(m);
    const verdicts = await verdictsFor(children);
    const plan = planNext({ children, verdicts, qaAgentId: roles.qa.agentId, maxRepairs });
    return {
      mission_id: mid, issueId: m.id, status: m.status, next: plan,
      tasks: children.map(c => Object.assign({ id: c.id, status: c.status, assigneeAgentId: c.assigneeAgentId || null }, parseStageTitle(c.title))),
      verdicts
    };
  }

  async function listMissions() {
    const rows = await client.listIssues({ view: 'index' });
    const list = Array.isArray(rows) ? rows : (rows && (rows.issues || rows.items)) || [];
    return list.filter(i => parseMissionTitle(i.title)).map(i => ({ mission_id: parseMissionTitle(i.title), issueId: i.id, status: i.status }));
  }

  // Low-cost safety net for missed events. Never launches a model: it only reads and, if needed, creates one task.
  async function reconcileAll() {
    const out = [];
    for (const m of await listMissions()) {
      if (m.status === 'done' || m.status === 'cancelled' || m.status === 'blocked') continue;
      out.push({ mission_id: m.mission_id, result: await reconcile(m.mission_id) });
    }
    return out;
  }

  async function emergencyStop({ reason, by }) {
    store.setStopped({ reason: reason || 'owner stop', by: by || 'owner' });
    const paused = [];
    const cancelled = [];
    for (const key of ['pi', 'hermes', 'qa']) {
      const r = roles[key];
      if (!r || !r.agentId) continue;
      try { await client.pauseAgent(r.agentId); paused.push(key); } catch (e) { paused.push(key + ':FAILED:' + e.message); }
    }
    for (const cp of store.allCheckpoints()) {
      if (cp.phase === 'running' && cp.runId) { try { await client.cancelRun(cp.runId); cancelled.push(cp.runId); } catch { /* run may have ended */ } }
    }
    return { stopped: true, paused, cancelled_runs: cancelled };
  }
  async function resumeAll() {
    store.clearStopped();
    const resumed = [];
    for (const key of ['pi', 'hermes', 'qa']) {
      const r = roles[key];
      if (r && r.agentId) { try { await client.resumeAgent(r.agentId); resumed.push(key); } catch { /* ignore */ } }
    }
    return { stopped: false, resumed };
  }

  return { submitMission, authorize, reconcile, reconcileAll, accept, status, listMissions, emergencyStop, resumeAll, _readSpec: readSpec };
}

module.exports = { makeHeisenberg, restrictedOf, parseVerdict, AUTONOMOUS_PERMISSIONS, COMMENT_PREFIX };
