'use strict';

const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const AGENT_CLASSES = new Set(['persistent', 'mission']);
const MISSION_STATES = new Set(['planned', 'queued', 'running', 'blocked', 'completed', 'failed', 'cancelled']);

function text(v, max) {
  const s = String(v == null ? '' : v).trim();
  return max ? s.slice(0, max) : s;
}

function id(v, field) {
  const s = text(v, 64).toLowerCase();
  if (!ID_RE.test(s)) throw new Error((field || 'id') + ' is invalid');
  return s;
}

function normalizeAgent(raw) {
  raw = raw || {};
  const cls = text(raw.class || 'mission', 16).toLowerCase();
  if (!AGENT_CLASSES.has(cls)) throw new Error('agent class is invalid');
  return {
    id: id(raw.id, 'agent.id'),
    role: text(raw.role || 'worker', 80),
    class: cls,
    image: text(raw.image || 'nicks-stack', 80),
    computerId: raw.computerId ? id(raw.computerId, 'agent.computerId') : null,
    identityId: raw.identityId ? id(raw.identityId, 'agent.identityId') : null,
    status: text(raw.status || 'planned', 32)
  };
}

function normalizeComputer(raw) {
  raw = raw || {};
  return {
    id: id(raw.id, 'computer.id'),
    provider: id(raw.provider, 'computer.provider'),
    providerRef: text(raw.providerRef || '', 180) || null,
    state: text(raw.state || 'unknown', 32),
    isolated: raw.isolated === true,
    ephemeral: raw.ephemeral === true,
    agentId: raw.agentId ? id(raw.agentId, 'computer.agentId') : null,
    image: text(raw.image || '', 80) || null
  };
}

function normalizeIdentity(raw) {
  raw = raw || {};
  return {
    id: id(raw.id, 'identity.id'),
    agentId: id(raw.agentId, 'identity.agentId'),
    email: text(raw.email || '', 254) || null,
    phone: text(raw.phone || '', 64) || null,
    telegram: text(raw.telegram || '', 128) || null,
    vaultRef: text(raw.vaultRef || '', 256) || null,
    // references only: credentials never belong in this contract
    credentialRefs: Array.isArray(raw.credentialRefs) ? raw.credentialRefs.map(x => text(x, 128)).filter(Boolean).slice(0, 50) : []
  };
}

function normalizeMission(raw) {
  raw = raw || {};
  const state = text(raw.state || 'planned', 16).toLowerCase();
  if (!MISSION_STATES.has(state)) throw new Error('mission state is invalid');
  const objective = text(raw.objective, 12000);
  if (!objective) throw new Error('mission.objective is required');
  return {
    id: id(raw.id, 'mission.id'),
    agentId: id(raw.agentId, 'mission.agentId'),
    projectId: raw.projectId ? id(raw.projectId, 'mission.projectId') : null,
    objective,
    state,
    budgetUsd: raw.budgetUsd == null ? null : Math.max(0, Number(raw.budgetUsd) || 0),
    requiresHumanApproval: raw.requiresHumanApproval === true,
    executionLane: text(raw.executionLane || '', 32) || null,
    computerId: raw.computerId ? id(raw.computerId, 'mission.computerId') : null
  };
}

function normalizeEvidence(raw) {
  raw = raw || {};
  const evidence = {
    id: id(raw.id, 'evidence.id'),
    missionId: id(raw.missionId, 'evidence.missionId'),
    kind: text(raw.kind || 'receipt', 40),
    source: text(raw.source || 'starnet', 80),
    sha256: text(raw.sha256 || '', 128) || null,
    uri: text(raw.uri || '', 2048) || null,
    note: text(raw.note || '', 2000) || null,
    verified: raw.verified === true
  };
  if (!evidence.sha256 && !evidence.uri && !evidence.note) throw new Error('evidence needs sha256, uri, or note');
  return evidence;
}

module.exports = {
  ID_RE,
  normalizeAgent,
  normalizeComputer,
  normalizeIdentity,
  normalizeMission,
  normalizeEvidence
};
