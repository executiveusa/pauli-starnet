'use strict';
// one-system 04_one_queue: districts on top of Paperclip (program/one-system/CONTEXT.md, D3, D6, D10).
//   - the district list and rosters come from the files the walk test checks (one home per fact)
//   - standing jobs are read from each district's "## Standing jobs" table; nothing is scheduled twice per period
//   - the district board is derived from Paperclip missions only; no evidence means IDLE, never "busy"
const fs = require('fs');
const path = require('path');
const { parseCitizens } = require('../../scripts/icm/walk.js');
const { parseMissionTitle } = require('./planner.js');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return null; } };
const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function loadCity() {
  const reg = JSON.parse(read('registry/districts.json') || '{}');
  const list = Array.isArray(reg) ? reg : reg.districts || [];
  const lanes = (JSON.parse(read('registry/district-lanes.json') || '{}').lanes) || {};
  return list.map(d => {
    const ctx = read('districts/' + d.id + '/CONTEXT.md') || '';
    const roster = parseCitizens(read('districts/' + d.id + '/citizens.yaml') || '');
    const citizens = [...roster.citizens];
    const inc = String(roster.includes || '').replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).filter(Boolean);
    for (const f of inc) citizens.push(...parseCitizens(read(f) || '').citizens);
    return { id: d.id, active: !!(lanes[d.id] && lanes[d.id].active), citizens, standing: parseStanding(ctx) };
  });
}

// "| when | job | agent | outcome |" rows under "## Standing jobs".
function parseStanding(contextText) {
  const sec = String(contextText).split('## Standing jobs')[1];
  if (!sec) return [];
  const body = sec.split('\n## ')[0];
  const rows = [];
  for (const line of body.split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 6 || /^-+$/.test(cells[1]) || cells[1].toLowerCase() === 'when') continue;
    const when = parseWhen(cells[1]);
    if (when) rows.push({ when: cells[1], job: cells[2], agent: cells[3], outcome: cells[4], rule: when });
  }
  return rows;
}

// Supported: "every N min", "daily HH:MM", "weekdays HH:MM", "nightly HH:MM", "weekly Mon HH:MM", "monthly 1st".
// Anything else ("parked") is not scheduled.
function parseWhen(text) {
  const t = String(text).toLowerCase().trim();
  let m;
  if ((m = /^every (\d+) min/.exec(t))) return { kind: 'interval', minutes: Number(m[1]) };
  if ((m = /^(daily|nightly) (\d{1,2}):(\d{2})/.exec(t))) return { kind: 'daily', h: +m[2], min: +m[3], days: null };
  if ((m = /^weekdays (\d{1,2}):(\d{2})/.exec(t))) return { kind: 'daily', h: +m[1], min: +m[2], days: [1, 2, 3, 4, 5] };
  if ((m = /^weekly (sun|mon|tue|wed|thu|fri|sat)\w* (\d{1,2}):(\d{2})/.exec(t))) return { kind: 'daily', h: +m[2], min: +m[3], days: [DAYS[m[1]]] };
  if (/^monthly 1st/.test(t)) return { kind: 'monthly', day: 1 };
  return null;
}

// The period key a standing job belongs to at time `now` (UTC), or null when it is not due yet in this period.
function periodKey(rule, now) {
  const d = new Date(now);
  if (rule.kind === 'interval') return 'i' + Math.floor(d.getTime() / (rule.minutes * 60000));
  if (rule.kind === 'monthly') return d.getUTCDate() >= rule.day ? 'm' + d.toISOString().slice(0, 7) : null;
  if (rule.days && !rule.days.includes(d.getUTCDay())) return null;
  const due = d.getUTCHours() * 60 + d.getUTCMinutes() >= rule.h * 60 + rule.min;
  return due ? 'd' + d.toISOString().slice(0, 10) : null;
}

// Which standing jobs should start now. `alreadyRun` is a Set of "<district>|<job>|<period>" keys.
// Inactive districts schedule nothing. Rows for the command chain (Instinct, Heisenberg) and loops of 15 minutes or
// less run in the gateway, not as missions. An agent that is not READY or LIVE is reported, not scheduled.
const CHAIN = new Set(['instinct', 'heisenberg', 'none']);
function dueStanding(city, now, alreadyRun) {
  const out = [];
  for (const d of city) {
    if (!d.active) continue;
    for (const s of d.standing) {
      if (CHAIN.has(s.agent) || (s.rule.kind === 'interval' && s.rule.minutes <= 15)) continue;
      const p = periodKey(s.rule, now);
      if (!p) continue;
      const key = d.id + '|' + s.job + '|' + p;
      if (alreadyRun.has(key)) continue;
      const who = d.citizens.find(c => c.id === s.agent);
      const ready = who && (who.status === 'READY' || who.status === 'LIVE');
      out.push({ key, district: d.id, job: s.job, outcome: s.outcome, builder: s.agent, judge: who ? who.judged_by : null,
        skip: ready ? null : (who ? s.agent + ' is ' + who.status : s.agent + ' is not in the roster') });
    }
  }
  return out;
}

// District board from Paperclip missions: RUNNING (a mission in flight), BLOCKED (waiting on someone, with why),
// IDLE (nothing approved waiting). Missions without a district spec count toward `command`.
function districtBoard(city, missions) {
  const board = {};
  for (const d of city) board[d.id] = { id: d.id, active: d.active, state: 'IDLE', running: 0, blocked: 0, waiting_owner: 0, missions: [] };
  for (const m of missions || []) {
    const id = (m.spec && m.spec.district && board[m.spec.district]) ? m.spec.district : 'command';
    const b = board[id];
    if (!b) continue;
    const mid = parseMissionTitle(m.title) || m.id;
    if (m.status === 'blocked') { b.blocked++; b.missions.push({ mid, state: 'BLOCKED' }); }
    else if (m.status === 'in_review') { b.waiting_owner++; b.missions.push({ mid, state: 'AWAITING_OWNER' }); }
    else if (m.status === 'todo' || m.status === 'in_progress') { b.running++; b.missions.push({ mid, state: 'RUNNING' }); }
  }
  for (const b of Object.values(board)) {
    b.state = b.running ? 'RUNNING' : (b.blocked || b.waiting_owner) ? 'BLOCKED' : 'IDLE';
    if (!b.active && b.state === 'IDLE') b.state = 'PARKED';
  }
  return Object.values(board);
}

module.exports = { loadCity, parseStanding, parseWhen, periodKey, dueStanding, districtBoard };
