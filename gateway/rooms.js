/* rooms.js — meeting rooms (issue #71): one room per project where agents and the reviewer share a thread.
   A room is a manifest rooms/<project>.json plus one agent-mail thread. This module validates manifests against
   the district registry and the agent roster, and reports only what agent-mail can prove about each room.
   Ruthless rule: no field asserts what the harness can't prove. Message counts and last-message times stay null
   until the agent-mail client can read a thread; members are "registered" only when agent-mail lists them. */
'use strict';

const fs = require('fs');
const path = require('path');

const STATUSES = ['active', 'paused', 'closed'];
const REVIEWER = 'reviewer'; // standing member of every room
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

// One manifest -> list of problems (empty = valid). districtIds/agentIds come from the registries.
function validateRoom(doc, { districtIds, agentIds, file }) {
  const errs = [];
  const r = doc && doc.room;
  if (!r || typeof r !== 'object') return ['missing "room" object'];
  if (typeof r.project !== 'string' || !SLUG.test(r.project)) errs.push('project must be a lowercase slug');
  if (file && r.project && path.basename(file, '.json') !== r.project) errs.push('file name must match project (' + r.project + '.json)');
  if (!districtIds.includes(r.district)) errs.push('district "' + r.district + '" is not in registry/districts.json');
  if (!Array.isArray(r.members) || !r.members.length) errs.push('members must be a non-empty list');
  const members = Array.isArray(r.members) ? r.members : [];
  for (const m of members) if (m !== REVIEWER && !agentIds.includes(m)) errs.push('member "' + m + '" is not in registry/agents.yaml');
  if (!members.includes(REVIEWER)) errs.push('the reviewer is a standing member of every room');
  if (!members.includes(r.chair)) errs.push('chair must be one of the members');
  if (r.chair === REVIEWER) errs.push('the reviewer cannot chair (builder and judge are not the same voice)');
  if (typeof r.approver !== 'string' || !r.approver) errs.push('approver must be named (identity and money decisions route there)');
  if (!Array.isArray(r.files) || r.files.some(f => typeof f !== 'string' || !f)) errs.push('files must be a list of pointers (paths or knowledge ids)');
  if (typeof r.schedule !== 'string' || !r.schedule) errs.push('schedule must reference a loop or cadence note');
  if (!STATUSES.includes(r.status)) errs.push('status must be one of ' + STATUSES.join('/'));
  if (r.thread_id !== null && (typeof r.thread_id !== 'string' || !r.thread_id)) errs.push('thread_id is a string, or null until agent-mail opens the thread');
  return errs;
}

// Read every rooms/*.json. Bad manifests are reported, never silently dropped.
function loadRooms(dir, { districtIds, agentIds }) {
  const rooms = [];
  const errors = [];
  let names = [];
  try { names = fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort(); } catch (_) { return { rooms, errors: ['rooms directory not found: ' + dir] }; }
  for (const name of names) {
    const file = path.join(dir, name);
    let doc;
    try { doc = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { errors.push(name + ': unparseable JSON'); continue; }
    const errs = validateRoom(doc, { districtIds, agentIds, file });
    if (errs.length) errors.push(...errs.map(e => name + ': ' + e));
    else rooms.push(doc.room);
  }
  return { rooms, errors };
}

// What agent-mail proves about one room. `directory` is an async (projectKey) -> list_agents result, or null when
// no agent-mail client is configured. Never throws; an unreachable agent-mail is a visible state, not an empty card.
async function roomProof(room, { directory, projectKey }) {
  const proof = { agent_mail: 'not_configured', thread_open: room.thread_id !== null, registered_members: null, message_count: null, last_message_at: null, error: null };
  if (!directory) return proof;
  try {
    const listed = await directory(projectKey);
    const agents = Array.isArray(listed) ? listed : (listed && Array.isArray(listed.agents) ? listed.agents : []);
    const names = new Set(agents.map(a => String((a && (a.name || a.program)) || '').toLowerCase()));
    proof.agent_mail = 'reachable';
    proof.registered_members = room.members.filter(m => m !== REVIEWER && (names.has(m) || names.has('starnet-' + m)));
  } catch (e) {
    proof.agent_mail = 'unreachable';
    proof.error = String(e && e.message || e).slice(0, 200);
  }
  return proof;
}

function agentIdsFromYaml(text) {
  return [...String(text).matchAll(/^\s*-\s*id:\s*([a-z0-9-]+)\s*$/gm)].map(m => m[1]);
}

module.exports = { validateRoom, loadRooms, roomProof, agentIdsFromYaml, REVIEWER, STATUSES };
