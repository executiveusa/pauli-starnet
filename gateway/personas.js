/* personas.js - the persona library (program/starnet-v2/04_personas): model-agnostic role cards any agent can load.
   Index: registry/personas.json (built by scripts/personas/import.js). Bodies: personas/<department>/<slug>.md.
   Serving rule: action "allow" serves the body; "ask" (caution) and "block" (dangerous) are listed but withheld until the
   captain approves that exact content, recorded in registry/persona-approvals.json as { "<id>": "<sha256>" }. The body is
   re-hashed on every read, so an edited file is refused instead of served. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ID = /^[a-z0-9-]+\/[a-z0-9-]+$/;

function loadLibrary(registryDir) {
  const index = JSON.parse(fs.readFileSync(path.join(registryDir, 'personas.json'), 'utf8'));
  let approvals = {};
  try { approvals = JSON.parse(fs.readFileSync(path.join(registryDir, 'persona-approvals.json'), 'utf8')); } catch (_) { /* none yet */ }
  return { index, approvals };
}

function summary(p, approvals) {
  const approved = approvals[p.id] === p.sha256;
  return {
    id: p.id, name: p.name, description: p.description, department: p.department, district: p.district,
    vibe: p.vibe, emoji: p.emoji, verdict: p.verdict, servable: p.action === 'allow' || approved,
    review: p.action === 'allow' ? null : (approved ? 'approved by captain' : (p.action === 'block' ? 'quarantined' : 'awaiting captain review'))
  };
}

// GET /v1/personas?district=&department=&q=
function list(lib, { district, department, q } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  const rows = lib.index.personas
    .filter(p => (!district || p.district === district) && (!department || p.department === department))
    .filter(p => !needle || (p.name + ' ' + p.description + ' ' + p.id).toLowerCase().includes(needle))
    .map(p => summary(p, lib.approvals));
  return { format: lib.index.format, upstream: lib.index.upstream, count: rows.length, personas: rows };
}

// GET /v1/personas/<department>/<slug> -> { code, body }
function get(lib, rootDir, id) {
  if (!ID.test(String(id))) return { code: 400, body: { error: 'BAD_PERSONA_ID' } };
  const p = lib.index.personas.find(x => x.id === id);
  if (!p) return { code: 404, body: { error: 'NO_SUCH_PERSONA' } };
  const s = summary(p, lib.approvals);
  if (!s.servable) return { code: 403, body: { error: 'PERSONA_WITHHELD', persona: s } };
  let text;
  try { text = fs.readFileSync(path.join(rootDir, p.path), 'utf8'); } catch (_) { return { code: 503, body: { error: 'PERSONA_FILE_MISSING', persona: s } }; }
  if (crypto.createHash('sha256').update(text).digest('hex') !== p.sha256) return { code: 409, body: { error: 'PERSONA_HASH_MISMATCH', persona: s } };
  return { code: 200, body: { persona: s, sha256: p.sha256, content: text } };
}

module.exports = { loadLibrary, list, get };
