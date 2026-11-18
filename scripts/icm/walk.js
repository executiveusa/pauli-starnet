'use strict';
// one-system 02_walk_test: the ICM walk test, run cold against the files (program/one-system/CONTEXT.md D4).
// A model with no memory must be able to: open START_HERE.md, route to a district, find the district's job, rules,
// knowledge, standing jobs and human check, and find every agent's role, done-means and independent judge.
// Nothing here calls a model, so the result is the same whichever model later walks the files.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOKEN_LIMIT = 8000;          // entry + one contract should fit a small context
const ENTRY_LINE_LIMIT = 60;
const DISTRICT_SECTIONS = ['## Agents', '## Jobs and done-means', '## Rules', '## Knowledge', '## Standing jobs', '## Human check'];
const CITIZEN_FIELDS = ['id', 'role', 'status', 'done_means', 'judged_by'];
const STATUSES = new Set(['LIVE', 'READY', 'PARKED', 'PLANNED']);

const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return null; } };
const tokens = (s) => Math.ceil(String(s || '').length / 4);

// Minimal reader for the citizens.yaml subset used in this repo: top-level scalars and a `citizens:` list of
// flat maps whose values are scalars or [inline, lists]. Anything else is reported, not guessed.
function parseCitizens(text) {
  const out = { citizens: [], errors: [] };
  let cur = null;
  let inList = false;
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    if (/^citizens:\s*$/.test(line)) { inList = true; continue; }
    if (!inList) { const m = /^([a-z_]+):\s*(.*)$/.exec(line); if (m) out[m[1]] = m[2].trim(); continue; }
    const item = /^\s*-\s+([a-z_]+):\s*(.*)$/.exec(line);
    const field = /^\s+([a-z_]+):\s*(.*)$/.exec(line);
    if (item) { cur = {}; out.citizens.push(cur); cur[item[1]] = value(item[2]); }
    else if (field && cur) cur[field[1]] = value(field[2]);
    else out.errors.push('unreadable line: ' + raw.trim().slice(0, 80));
  }
  return out;
}
function value(v) {
  if (Array.isArray(v)) return v;
  const s = String(v).trim().replace(/^["']|["']$/g, '');
  if (/^\[.*\]$/.test(s)) return s.slice(1, -1).split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  return s;
}

// Every `backticked/relative/path` in a contract must exist. Only tokens that start with a real folder (at the repo
// root or beside the contract) are treated as paths, so repo names, labels and placeholders are not misread.
function brokenPaths(text, baseDir) {
  const out = [];
  const re = /`([A-Za-z0-9_.\-]+\/[A-Za-z0-9_.\-/]*)`/g;
  let m;
  while ((m = re.exec(text))) {
    const p = m[1].replace(/\/$/, '');
    if (p.includes('<') || /NNN|\{/.test(p)) continue;
    const first = p.split('/')[0];
    const rootDir = fs.existsSync(path.join(ROOT, first)) && fs.statSync(path.join(ROOT, first)).isDirectory();
    const localDir = fs.existsSync(path.join(ROOT, baseDir, first)) && fs.statSync(path.join(ROOT, baseDir, first)).isDirectory();
    if (!rootDir && !localDir) continue;
    if (!fs.existsSync(path.join(ROOT, p)) && !fs.existsSync(path.join(ROOT, baseDir, p))) out.push(p);
  }
  return [...new Set(out)];
}

function walkEntry() {
  const problems = [];
  const text = read('START_HERE.md');
  if (!text) return { ok: false, problems: ['START_HERE.md is missing'] };
  if (text.split('\n').length > ENTRY_LINE_LIMIT) problems.push('START_HERE.md is over ' + ENTRY_LINE_LIMIT + ' lines');
  for (const p of brokenPaths(text, '.')) problems.push('START_HERE.md points to a missing path: ' + p);
  return { ok: problems.length === 0, problems };
}

function districtIds() {
  const reg = JSON.parse(read('registry/districts.json') || '{}');
  const list = Array.isArray(reg) ? reg : reg.districts || [];
  return list.map(d => d.id);
}

function walkDistrict(id) {
  const problems = [];
  const dir = 'districts/' + id;
  const ctx = read(dir + '/CONTEXT.md');
  if (!ctx) return { id, ok: false, problems: [dir + '/CONTEXT.md is missing'], agents: [] };
  if (!/^One job:/m.test(ctx)) problems.push('CONTEXT.md has no "One job:" line');
  for (const s of DISTRICT_SECTIONS) if (!ctx.includes(s)) problems.push('CONTEXT.md has no "' + s + '" section');
  for (const p of brokenPaths(ctx, dir)) problems.push('CONTEXT.md points to a missing path: ' + p);
  const entry = read('START_HERE.md') || '';
  if (tokens(entry) + tokens(ctx) > TOKEN_LIMIT) problems.push('START_HERE.md + CONTEXT.md is over ' + TOKEN_LIMIT + ' tokens');

  const roster = read(dir + '/citizens.yaml');
  const agents = [];
  const judges = [];
  if (!roster) problems.push(dir + '/citizens.yaml is missing (the district roster)');
  else {
    // A district roster may include sub-team rosters kept in an aliased folder (one home per agent).
    const main = parseCitizens(roster);
    const parts = [{ file: dir + '/citizens.yaml', parsed: main }];
    for (const inc of [].concat(value(main.includes || '') || []).filter(Boolean)) {
      const t = read(inc);
      if (!t) { problems.push('citizens.yaml includes a missing roster: ' + inc); continue; }
      parts.push({ file: inc, parsed: parseCitizens(t) });
    }
    const aliases = (JSON.parse(read('registry/district-lanes.json') || '{}').aliases) || {};
    const parsed = { citizens: [], errors: [] };
    for (const part of parts) {
      for (const e of part.parsed.errors) problems.push(part.file + ' ' + e);
      const d = part.parsed.district;
      if (d !== id && aliases[d] !== id) problems.push(part.file + ' says district "' + d + '", expected "' + id + '" or one of its aliases');
      parsed.citizens.push(...part.parsed.citizens);
    }
    const ids = new Set();
    for (const c of parsed.citizens) {
      const who = c.id || '(no id)';
      for (const f of CITIZEN_FIELDS) if (!c[f] || (Array.isArray(c[f]) && !c[f].length)) problems.push(who + ': missing ' + f);
      if (c.status && !STATUSES.has(c.status)) problems.push(who + ': status must be one of ' + [...STATUSES].join(', '));
      if (c.judged_by && c.judged_by === c.id) problems.push(who + ': cannot judge its own work');
      if (ids.has(c.id)) problems.push(who + ': listed twice');
      ids.add(c.id);
      for (const key of ['path', 'seat', 'knowledge']) {
        if (typeof c[key] === 'string' && c[key] && !fs.existsSync(path.join(ROOT, c[key])) && !fs.existsSync(path.join(ROOT, dir, c[key]))) {
          problems.push(who + ': ' + key + ' points to a missing path: ' + c[key]);
        }
      }
      agents.push(c.id);
      if (c.judged_by) judges.push({ agent: c.id, judge: c.judged_by });
    }
    if (!parsed.citizens.length) problems.push('citizens.yaml lists no agents');
  }
  return { id, ok: problems.length === 0, problems, agents, judges };
}

function walkAll() {
  const entry = walkEntry();
  const districts = districtIds().map(walkDistrict);
  // An agent belongs to exactly one district.
  const home = new Map();
  for (const d of districts) for (const a of d.agents) {
    if (home.has(a)) d.problems.push(a + ': also listed in district ' + home.get(a) + ' (one home per agent)');
    else home.set(a, d.id);
  }
  // Every judge must be a real agent somewhere in the city, or the owner.
  for (const d of districts) for (const j of d.judges || []) {
    if (j.judge !== 'owner' && !home.has(j.judge)) d.problems.push(j.agent + ': judged_by "' + j.judge + '" is not an agent in any district');
  }
  for (const d of districts) d.ok = d.problems.length === 0;
  return { ok: entry.ok && districts.every(d => d.ok), entry, districts, agents: home.size };
}

module.exports = { walkAll, walkDistrict, walkEntry, parseCitizens, brokenPaths, DISTRICT_SECTIONS, CITIZEN_FIELDS };

if (require.main === module) {
  const r = walkAll();
  console.log((r.entry.ok ? 'PASS' : 'FAIL') + '  START_HERE.md' + (r.entry.ok ? '' : '\n      ' + r.entry.problems.join('\n      ')));
  for (const d of r.districts) console.log((d.ok ? 'PASS' : 'FAIL') + '  ' + d.id + ' (' + d.agents.length + ' agents)' + (d.ok ? '' : '\n      ' + d.problems.join('\n      ')));
  console.log((r.ok ? 'WALK TEST PASS' : 'WALK TEST FAIL') + ': ' + r.districts.filter(d => d.ok).length + '/' + r.districts.length + ' districts, ' + r.agents + ' agents');
  process.exit(r.ok ? 0 : 1);
}
