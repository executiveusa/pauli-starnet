/* intake.js - the software factory's intake queue (program/starnet-v2/02_intake-and-inbox).
   The captain and Instinct decide by voice; Instinct (or the command center) submits a repo with its instructions and the
   answers from the per-repo grill session. Heisenberg accepts at most MAX_PER_DAY repos per UTC day and refuses the next
   one. A skipped grill question is recorded with the architect's recommended answer and marked assumed; any intake that
   relies on an assumed answer is flagged for the captain's morning approval (yellow), the rest of it proceeds.
   Append-only JSONL, the same posture as the cost ledger: invalid rows are refused, never coerced. */
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_PER_DAY = 5;
const REPO_RE = /^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^[A-Za-z0-9_./-]{1,120}$/;
const SOURCES = ['instinct', 'command-center'];

function utcDay(ms) { return new Date(ms).toISOString().slice(0, 10); }

function cleanGrill(list) {
  if (list == null) return { grill: [] };
  if (!Array.isArray(list) || list.length > 100) return { error: 'grill must be a list of at most 100 questions' };
  const grill = [];
  for (const g of list) {
    const q = g && typeof g.question === 'string' ? g.question.trim().slice(0, 500) : '';
    if (!q) return { error: 'every grill entry needs a question' };
    const answered = typeof g.answer === 'string' && g.answer.trim();
    const rec = typeof g.recommended === 'string' ? g.recommended.trim().slice(0, 2000) : '';
    if (!answered && !rec) return { error: 'an unanswered grill question needs the recommended answer to assume: ' + q.slice(0, 80) };
    grill.push(answered ? { question: q, answer: g.answer.trim().slice(0, 2000), assumed: false }
                        : { question: q, answer: rec, assumed: true });
  }
  return { grill };
}

function makeIntake(file, opts) {
  const now = opts && typeof opts.now === 'function' ? opts.now : () => Date.now();
  const maxPerDay = opts && opts.maxPerDay > 0 ? opts.maxPerDay : MAX_PER_DAY;

  function read() {
    let txt = '';
    try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { return []; }
    const rows = [];
    for (const line of txt.split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); if (r && r.id && r.repo) rows.push(r); } catch (_) { /* skip a torn line */ }
    }
    return rows;
  }

  function submit(body) {
    const o = body && typeof body === 'object' ? body : {};
    const repo = typeof o.repo === 'string' ? o.repo.trim() : '';
    if (!REPO_RE.test(repo)) return { code: 400, body: { error: 'repo must be owner/name' } };
    const branch = o.branch == null ? 'main' : String(o.branch);
    if (!BRANCH_RE.test(branch) || branch.includes('..')) return { code: 400, body: { error: 'bad branch name' } };
    const instructions = typeof o.instructions === 'string' ? o.instructions.trim() : '';
    if (!instructions || instructions.length > 8000) return { code: 400, body: { error: 'instructions are required (<= 8000 chars)' } };
    if (!SOURCES.includes(o.submitted_by)) return { code: 400, body: { error: 'submitted_by must be ' + SOURCES.join(' or ') } };
    const g = cleanGrill(o.grill);
    if (g.error) return { code: 400, body: { error: g.error } };

    const t = now();
    const day = utcDay(t);
    const today = read().filter(r => r.day === day);
    if (today.some(r => r.repo.toLowerCase() === repo.toLowerCase())) return { code: 409, body: { error: 'ALREADY_IN_TODAY', repo } };
    if (today.length >= maxPerDay) return { code: 429, body: { error: 'DAILY_INTAKE_CAP', limit: maxPerDay, day, hint: 'Heisenberg takes at most ' + maxPerDay + ' repos per day; resubmit tomorrow' } };

    const assumed = g.grill.filter(x => x.assumed).length;
    const row = {
      id: 'intake-' + day + '-' + (today.length + 1), ts: new Date(t).toISOString(), day, repo, branch, instructions,
      submitted_by: o.submitted_by, grill: g.grill, assumed_answers: assumed,
      needs_morning_approval: assumed > 0, status: 'queued'
    };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(row) + '\n', { mode: 0o600 });
    return { code: 201, body: { intake: row, remaining_today: maxPerDay - today.length - 1 } };
  }

  function list(day) {
    const d = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : utcDay(now());
    const rows = read().filter(r => r.day === d);
    return { day: d, limit: maxPerDay, remaining: Math.max(0, maxPerDay - rows.length), intakes: rows };
  }

  return { submit, list, read };
}

module.exports = { makeIntake, MAX_PER_DAY, utcDay };
