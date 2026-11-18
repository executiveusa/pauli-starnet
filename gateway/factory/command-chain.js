'use strict';
// ONE-SYSTEM 01_roles (program/one-system/CONTEXT.md, D1, D2, D11).
// Who may do what, and who is in charge right now.
//
//   Instinct   Chief of Staff. Outside StarNet; proves it is alive with a heartbeat.
//   Heisenberg Foreman. Plans, assigns, chases stalls, keeps agents moving. When Instinct's heartbeat is stale he is
//              ACTING CHIEF OF STAFF with Instinct's powers, until Instinct's next heartbeat.
//   judge      Independent reviewer. Only role whose verdict can close work. Never the builder of that work.
//   worker     Does assigned work. Cannot assign, approve, accept or review its own output.
//   owner      Bambú. The only one who can release to production, spend over the delegation, or send what is gated.
//
// Pure decisions only: `now` and the last heartbeat come in as arguments, so everything here is testable.

const ROLES = ['owner', 'instinct', 'heisenberg', 'judge', 'worker'];

// Actions a role may take without anyone else. Owner-only actions are never delegated, even in succession.
const OWNER_ONLY = new Set(['release_production', 'spend_over_delegation', 'send_gated_message', 'grant_broad_access', 'destructive_change']);

const POWERS = {
  instinct: new Set(['set_priority', 'create_mission', 'assign', 'reassign', 'pause_agent', 'resume_agent',
    'accept_after_independent_pass', 'emergency_stop', 'resume_all', 'request_owner_approval', 'standing_jobs']),
  heisenberg: new Set(['plan', 'assign', 'reassign', 'nudge_stalled', 'escalate', 'create_stage', 'request_owner_approval']),
  judge: new Set(['verdict']),
  worker: new Set(['work_assigned', 'report_artifact', 'ask_question'])
};

const DEFAULT_STALE_MS = 5 * 60 * 1000; // Instinct silent this long -> Heisenberg acts (matches docs/COMMAND_BRIDGE.md's 5-minute rule)

function actingChief({ now, instinctLastSeen, staleAfterMs = DEFAULT_STALE_MS }) {
  const t = Date.parse(now);
  const seen = instinctLastSeen ? Date.parse(instinctLastSeen) : NaN;
  if (!Number.isFinite(seen)) return { acting: 'heisenberg', reason: 'no heartbeat from Instinct has ever been recorded', instinctLastSeen: null };
  const age = t - seen;
  if (age > staleAfterMs) {
    return { acting: 'heisenberg', reason: 'Instinct silent for ' + Math.round(age / 60000) + ' min (limit ' + Math.round(staleAfterMs / 60000) + ')', instinctLastSeen };
  }
  return { acting: 'instinct', reason: 'Instinct heartbeat is fresh', instinctLastSeen };
}

// May `role` take `action` now? Succession hands Instinct's powers to Heisenberg while he is acting chief.
// The builder of a piece of work can never be its judge (D11).
function can(role, action, { acting = 'instinct', builderAgentId, actorAgentId } = {}) {
  if (!ROLES.includes(role)) return { ok: false, why: 'unknown role' };
  if (role === 'owner') return { ok: true };
  if (OWNER_ONLY.has(action)) return { ok: false, why: 'owner only' };
  if (action === 'verdict' && builderAgentId && actorAgentId && builderAgentId === actorAgentId) {
    return { ok: false, why: 'the builder cannot review its own work' };
  }
  if (POWERS[role] && POWERS[role].has(action)) return { ok: true };
  if (role === 'heisenberg' && acting === 'heisenberg' && POWERS.instinct.has(action)) return { ok: true, via: 'succession' };
  return { ok: false, why: role + ' may not ' + action };
}

// Work that is assigned but not moving. Paperclip wakes an agent on assignment; if nothing changed after
// `ackMs` Heisenberg nudges once (re-wake), and after `escalateMs` he escalates to the acting chief.
function findStalls(issues, { now, ackMs = 2 * 60 * 60 * 1000, escalateMs = 6 * 60 * 60 * 1000 } = {}) {
  const t = Date.parse(now);
  const out = [];
  for (const i of issues || []) {
    if (!i || !i.assigneeAgentId) continue;
    if (!['todo', 'in_progress'].includes(i.status)) continue;
    const last = Date.parse(i.updatedAt || i.createdAt || '');
    if (!Number.isFinite(last)) continue;
    const idle = t - last;
    if (idle >= escalateMs) out.push({ issueId: i.id, agentId: i.assigneeAgentId, action: 'escalate', idleMin: Math.round(idle / 60000) });
    else if (idle >= ackMs) out.push({ issueId: i.id, agentId: i.assigneeAgentId, action: 'nudge', idleMin: Math.round(idle / 60000) });
  }
  return out;
}

module.exports = { ROLES, POWERS, OWNER_ONLY, DEFAULT_STALE_MS, actingChief, can, findStalls };
