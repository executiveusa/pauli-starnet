'use strict';
// STARFACTORY-001: the authenticated read model StarNet renders. It is DERIVED, never authored:
// every agent state below is computed from a Paperclip record or a bridge checkpoint and carries its evidence.
// With no evidence an agent is shown "sleeping" - the projection cannot make anyone look busy.
const crypto = require('crypto');
const { parseMissionTitle, parseStageTitle } = require('./planner.js');

const STATES = ['sleeping', 'waking', 'planning', 'working', 'delegating', 'waiting', 'reviewing', 'blocked', 'awaiting_approval', 'failed', 'recovering', 'completed'];

function listOf(rows) { return Array.isArray(rows) ? rows : (rows && (rows.issues || rows.items || rows.agents)) || []; }

function deriveAgentState({ key, agent, issues, checkpoint, stopped, handoffRecently }) {
  const now = new Date().toISOString();
  const ev = (source, extra) => Object.assign({ source, observedAt: now }, extra || {});
  if (stopped) return { state: 'blocked', reason: 'emergency stop is active', evidence: ev('bridge-control') };
  if (agent && (agent.status === 'paused' || agent.status === 'terminated')) return { state: 'blocked', reason: 'agent is ' + agent.status, evidence: ev('paperclip-agent', { agentId: agent.id }) };

  // Heisenberg has no worker run; his states come from the missions he owns.
  if (key === 'heisenberg') {
    const mine = issues.filter(i => parseMissionTitle(i.title) && i.assigneeAgentId === (agent && agent.id));
    const pending = mine.find(i => i.status === 'in_review' || (i.status === 'blocked' && /\(authorization required\)/.test(i.title || '')));
    if (pending) return { state: 'awaiting_approval', mission: parseMissionTitle(pending.title), evidence: ev('paperclip-issue', { issueId: pending.id }) };
    if (handoffRecently) return { state: 'delegating', mission: handoffRecently.mission, evidence: ev('handoff', { issueId: handoffRecently.issueId }) };
    const open = mine.find(i => i.status === 'todo' || i.status === 'in_progress');
    if (open) {
      const kids = issues.filter(i => i.parentId === open.id && parseStageTitle(i.title));
      if (!kids.length) return { state: 'planning', mission: parseMissionTitle(open.title), evidence: ev('paperclip-issue', { issueId: open.id }) };
      return { state: 'waiting', mission: parseMissionTitle(open.title), evidence: ev('paperclip-issue', { issueId: open.id }) };
    }
    const blocked = mine.find(i => i.status === 'blocked');
    if (blocked) return { state: 'blocked', mission: parseMissionTitle(blocked.title), evidence: ev('paperclip-issue', { issueId: blocked.id }) };
    return { state: 'sleeping', evidence: ev('none') };
  }

  if (checkpoint && checkpoint.phase === 'running') return { state: (checkpoint.retry || 0) > 0 ? 'recovering' : 'working', mission: checkpoint.mission || null, evidence: ev('bridge-checkpoint', { runId: checkpoint.runId, issueId: checkpoint.taskId }) };
  const mine = issues.filter(i => agent && i.assigneeAgentId === agent.id && parseStageTitle(i.title));
  const failed = mine.find(i => i.status === 'blocked' && checkpoint && checkpoint.phase === 'failed' && checkpoint.taskId === i.id);
  if (failed) return { state: 'failed', reason: checkpoint.reason, evidence: ev('bridge-checkpoint', { runId: checkpoint.runId, issueId: failed.id }) };
  const prog = mine.find(i => i.status === 'in_progress');
  if (prog) return { state: key === 'qa' ? 'reviewing' : 'working', evidence: ev('paperclip-issue', { issueId: prog.id }) };
  const todo = mine.find(i => i.status === 'todo');
  if (todo) return { state: 'waking', evidence: ev('paperclip-issue', { issueId: todo.id }) };
  if (checkpoint && checkpoint.phase === 'completed' && checkpoint.updatedAt && Date.now() - Date.parse(checkpoint.updatedAt) < 60000) return { state: 'completed', evidence: ev('bridge-checkpoint', { runId: checkpoint.runId, issueId: checkpoint.taskId }) };
  return { state: 'sleeping', evidence: ev('none') };
}

function makeProjection({ client, roles, store, ringSize = 500 }) {
  const epoch = crypto.randomBytes(4).toString('hex');
  let seq = 0;
  const ring = [];
  const subs = new Set();
  let last = { agents: {}, issues: new Map() };
  let initialized = false;
  let lastSnapshot = null;
  const recentHandoffs = [];

  function emit(type, data) {
    const ev = { id: epoch + '-' + (++seq), type, at: new Date().toISOString(), data };
    ring.push(ev); if (ring.length > ringSize) ring.shift();
    for (const s of subs) write(s, ev);
    return ev;
  }
  function write(res, ev) { try { res.write('id: ' + ev.id + '\nevent: ' + ev.type + '\ndata: ' + JSON.stringify(ev.data) + '\n\n'); } catch { subs.delete(res); } }

  async function snapshot() {
    const [agentRows, issueRows] = await Promise.all([client.listAgents(), client.listIssues({ view: 'rows' })]);
    const agents = listOf(agentRows);
    const issues = listOf(issueRows);
    const stopped = store.isStopped();
    const cps = store.allCheckpoints();
    const out = {};
    for (const key of Object.keys(roles)) {
      const r = roles[key];
      if (!r || !r.agentId) continue;
      const agent = agents.find(a => a.id === r.agentId) || null;
      const checkpoint = cps.filter(c => c.agentId === r.agentId).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
      const handoffRecently = key === 'heisenberg' ? recentHandoffs.find(h => Date.now() - h.at < 15000) : null;
      const st = deriveAgentState({ key, agent, issues, checkpoint, stopped, handoffRecently });
      out[key] = Object.assign({ key, agentId: r.agentId, name: (agent && agent.name) || key, role: (agent && agent.role) || key, lastActivity: (checkpoint && checkpoint.updatedAt) || null }, st);
    }
    lastSnapshot = { generatedAt: new Date().toISOString(), epoch, stopped, states: STATES, agents: out, missions: issues.filter(i => parseMissionTitle(i.title)).map(i => ({ mission_id: parseMissionTitle(i.title), issueId: i.id, status: i.status })) };
    return { snap: lastSnapshot, issues };
  }

  // Heisenberg reports each handoff the moment he creates it (the source of truth); polling is only a fallback.
  // De-duplicated by issue id so the two paths can never announce the same handoff twice.
  const seenHandoff = new Set();
  function noteHandoff({ mission, stage, seq, to, issueId }) {
    if (!issueId || seenHandoff.has(issueId)) return;
    seenHandoff.add(issueId);
    recentHandoffs.unshift({ at: Date.now(), mission, issueId });
    recentHandoffs.length = Math.min(recentHandoffs.length, 10);
    emit('factory.handoff', { mission, stage, seq, from: 'heisenberg', to, issueId });
  }

  // Poll Paperclip, diff against the previous observation, emit only real changes.
  async function poll() {
    const { snap, issues } = await snapshot();
    for (const [key, a] of Object.entries(snap.agents)) {
      const prev = last.agents[key];
      if (!prev || prev.state !== a.state || (prev.evidence && a.evidence && prev.evidence.runId !== a.evidence.runId)) {
        emit('factory.agent.state', { key, agentId: a.agentId, from: prev ? prev.state : null, to: a.state, mission: a.mission || null, evidence: a.evidence });
      }
    }
    for (const i of issues) {
      const p = last.issues.get(i.id);
      const stage = parseStageTitle(i.title);
      if (!p && stage && initialized) {
        const who = Object.entries(roles).find(([, r]) => r && r.agentId === i.assigneeAgentId);
        noteHandoff({ mission: stage.mission, stage: stage.stage, seq: stage.seq, to: who ? who[0] : null, issueId: i.id });
      } else if (p && p.status !== i.status) {
        emit('factory.task.status', { issueId: i.id, mission: (parseStageTitle(i.title) || {}).mission || parseMissionTitle(i.title), from: p.status, to: i.status });
      }
    }
    last = { agents: snap.agents, issues: new Map(issues.map(i => [i.id, { status: i.status }])) };
    initialized = true;
    return snap;
  }

  // SSE with replay. A client from a different epoch (bridge restarted) or older than the ring gets a full resync,
  // never a guess at what it missed.
  function subscribe(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const lastId = String(req.headers['last-event-id'] || '');
    const [e, n] = lastId.split('-');
    const known = e === epoch && Number.isFinite(Number(n));
    const oldest = ring.length ? Number(ring[0].id.split('-')[1]) : seq + 1;
    if (!known || Number(n) < oldest - 1) {
      write(res, { id: epoch + '-' + seq, type: 'factory.resync', data: lastSnapshot || { epoch, agents: {}, missions: [] } });
    } else {
      for (const ev of ring) if (Number(ev.id.split('-')[1]) > Number(n)) write(res, ev);
    }
    subs.add(res);
    req.on('close', () => subs.delete(res));
    const ka = setInterval(() => { try { res.write(': keep-alive\n\n'); } catch { clearInterval(ka); } }, 20000);
    ka.unref && ka.unref();
    req.on('close', () => clearInterval(ka));
  }

  return { poll, noteHandoff, snapshot: async () => (await snapshot()).snap, subscribe, epoch, _ring: ring };
}

module.exports = { makeProjection, deriveAgentState, STATES };
