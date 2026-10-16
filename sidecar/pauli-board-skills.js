'use strict';
/* sidecar/pauli-board-skills.js - the board skill registry.

   After a board ruling locks, seats/chair pick which distilled skills to execute with.
   The registry lives at <boardDir>/skills/registry.json (boardDir = the manifest's folder).
   Selection lands in the execution receipt: { skills: [...], pickedBy: 'chair' | 'match' }.

   Deterministic fallback: keyword hits over proposal + recommendation + reasoning text,
   one point per distinct keyword hit, ties broken by skill id (stable, testable). */
const fs = require('node:fs');
const path = require('node:path');

function loadRegistry(boardDir) {
  if (!boardDir) return { ok: false, reason: 'no-board-dir', skills: [] };
  const file = path.join(boardDir, 'skills', 'registry.json');
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {
    return { ok: false, reason: 'registry-missing-or-unparseable', skills: [] };
  }
  const errors = [];
  const skills = [];
  for (const raw of Array.isArray(parsed.skills) ? parsed.skills : []) {
    const missing = ['id', 'seat', 'title', 'path'].filter(k => typeof raw[k] !== 'string' || !raw[k].trim());
    if (missing.length) { errors.push('skill ' + (raw.id || '?') + ' missing: ' + missing.join(',')); continue; }
    if (/\.\./.test(raw.path)) { errors.push('skill ' + raw.id + ' path escapes the skills dir'); continue; }
    if (!fs.existsSync(path.join(boardDir, 'skills', raw.path))) { errors.push('skill ' + raw.id + ' file missing: ' + raw.path); continue; }
    if (!Array.isArray(raw.sources) || !raw.sources.length) { errors.push('skill ' + raw.id + ' cites no sources'); continue; }
    skills.push({
      id: raw.id, seat: raw.seat, title: raw.title, path: 'skills/' + raw.path,
      keywords: Array.isArray(raw.keywords) ? raw.keywords.map(k => String(k).toLowerCase()) : [],
      sources: raw.sources
    });
  }
  return { ok: errors.length === 0, errors, skills };
}

function selectSkills(text, skills, { max = 3 } = {}) {
  const hay = String(text || '').toLowerCase();
  const scored = skills.map(s => {
    const hits = s.keywords.filter(k => k && hay.includes(k)).length;
    return { skill: s, hits };
  }).filter(row => row.hits > 0);
  scored.sort((a, b) => b.hits - a.hits || (a.skill.id < b.skill.id ? -1 : 1));
  return scored.slice(0, max).map(row => ({
    id: row.skill.id, seat: row.skill.seat, title: row.skill.title, path: row.skill.path, matched: row.hits
  }));
}

/* Chair picks win when they name real registry ids; unknown ids are dropped, never invented. */
function chairPicks(chairIds, skills, { max = 3 } = {}) {
  if (!Array.isArray(chairIds)) return [];
  const known = new Set(skills.map(s => s.id));
  const picked = [];
  for (const id of chairIds) {
    const s = skills.find(x => x.id === id);
    if (s && known.has(id) && !picked.some(p => p.id === id)) {
      picked.push({ id: s.id, seat: s.seat, title: s.title, path: s.path });
    }
    if (picked.length >= max) break;
  }
  return picked;
}

/* One call for the runner: returns the receipt block. Fail-open: no registry => skills omitted. */
function pickBoardSkills({ boardDir, proposal, verdict }) {
  const reg = loadRegistry(boardDir);
  if (!reg.skills.length) return null;
  const fromChair = chairPicks(verdict && verdict.skills, reg.skills);
  if (fromChair.length) return { pickedBy: 'chair', registryOk: reg.ok, skills: fromChair };
  const text = [proposal, verdict && verdict.recommendation, verdict && verdict.judge_reasoning, verdict && verdict.reasoning].filter(Boolean).join('\n');
  const matched = selectSkills(text, reg.skills);
  return { pickedBy: 'match', registryOk: reg.ok, skills: matched };
}

module.exports = { loadRegistry, selectSkills, chairPicks, pickBoardSkills };
