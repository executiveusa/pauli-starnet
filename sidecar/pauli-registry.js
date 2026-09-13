/* sidecar/pauli-registry.js — Pauli's Hall of Canon registry (paperclip patterns port, chunk 4).

   Port of the registry concepts from executiveusa/paperclip-pauli-clip (MIT, upstream
   paperclipai/paperclip @ 300c54c3 - one orchestration registry covering every agent/tool the
   company runs, each behind a uniform interface). See districts/pauli/imports/paperclip/IMPORT.md
   and the Paperclip registry reference in districts/pauli/canon/studio-control-plane/README.md.

   ONE REGISTRY for agents, skills, and tools - extending starnet's existing skill-library pattern
   (sidecar/skillstore.js) to all three kinds. The law that makes it the HALL OF CANON:

   PROVENANCE-REQUIRED: no entry lands without { source, sourceSha, license }. A registry that
   cannot say where something came from and under what license is a rumor mill, not a canon.
   Every entry also carries registeredAt + a content hash; re-registration supersedes but keeps
   the full provenance history, so the chain of custody is never rewritten.

   REVIEW LADDER: draft -> reviewed -> canon, one direction only, each hop recording reviewer +
   timestamp. canon is where an entry becomes load-bearing for the city.

   LICENSE LAW (districts/pauli/CONTEXT.md): licenses NOASSERTION / none / AGPL* put the entry on
   LICENSE HOLD - it can be drafted and reviewed but can NEVER reach canon (MIT/Apache attribute
   and proceed; AGPL is a separate process; NOASSERTION/none = STOP).

   Every ambient dependency is INJECTED (fs, pathMod, clock, crypto). Storage is append-only JSONL,
   replayed on boot; storage failures FAIL-OPEN. No Date.now - the clock is injected.

   makePauliRegistry({ fs, pathMod, root, clock, crypto })
     register({ kind, name, source, sourceSha, license, meta? })   -> { ok, entry? | error }
     review({ kind, name, state, reviewer })                       -> { ok, entry? | error }
     get(kind, name)                                               -> { ok, entry? | error }
     provenance(kind, name)                                        -> { ok, chain }      // full history
     list({ kind?, reviewState? })                                 -> { ok, entries }
     stats()                                                       -> { ok, byKind, byState, holds } */
'use strict';

const KINDS = ['agent', 'skill', 'tool'];
const STATES = ['draft', 'reviewed', 'canon'];
const LICENSE_HOLD = /^(noassertion|none|agpl)/i;

function makePauliRegistry(deps) {
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock, crypto = deps.crypto;
  const root = deps.root;
  if (!fs || !pathMod || typeof clock !== 'function' || !crypto || !root) throw new Error('pauli-registry: fs, pathMod, root, clock, crypto are required');
  const dir = pathMod.join(root, 'pauli-registry');
  const logFile = pathMod.join(dir, 'entries.jsonl');
  const entries = new Map(); // key `${kind}/${name}` -> current entry

  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });
  const keyOf = (kind, name) => kind + '/' + name;

  function hash(text) { return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex'); }
  function ensureDir() { try { fs.mkdirSync(dir, { recursive: true }); return true; } catch (_) { return false; } }
  function append(entry) {
    try { ensureDir(); fs.appendFileSync(logFile, JSON.stringify(entry) + '\n'); return true; } catch (_) { return false; }
  }
  function replay() {
    let lines;
    try { lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean); } catch (_) { return; }
    for (const line of lines) {
      let e; try { e = JSON.parse(line); } catch (_) { continue; }
      if (e && e.op === 'register') entries.set(keyOf(e.entry.kind, e.entry.name), e.entry);
      else if (e && e.op === 'review') {
        const cur = entries.get(keyOf(e.kind, e.name));
        if (cur) { cur.reviewState = e.state; cur.reviews = e.reviews; }
      }
    }
  }
  replay();

  function register({ kind, name, source, sourceSha, license, meta }) {
    if (!KINDS.includes(kind)) return bad('bad-kind', 'kind must be agent, skill, or tool');
    if (typeof name !== 'string' || !name.trim()) return bad('bad-name', 'name required');
    // provenance-required: the registry refuses rumors (IMPORT.md: entry without source SHA rejected)
    if (typeof source !== 'string' || !source.trim()) return bad('provenance-required', 'source is required');
    if (typeof sourceSha !== 'string' || !sourceSha.trim()) return bad('provenance-required', 'source SHA is required');
    if (typeof license !== 'string' || !license.trim()) return bad('provenance-required', 'license is required');
    const key = keyOf(kind, name);
    const prior = entries.get(key);
    const entry = {
      kind, name,
      provenance: { source, sourceSha, license },
      meta: meta || {},
      version: prior ? prior.version + 1 : 1,
      reviewState: 'draft',
      reviews: [],
      licenseHold: LICENSE_HOLD.test(license),
      registeredAt: clock(),
      hash: hash(kind + name + source + sourceSha + license),
      history: prior ? prior.history.concat([{ version: prior.version, sourceSha: prior.provenance.sourceSha, license: prior.provenance.license, registeredAt: prior.registeredAt }]) : []
    };
    entries.set(key, entry);
    append({ op: 'register', entry }); // fail-open: the in-memory registration stands
    return ok({ entry });
  }

  function review({ kind, name, state, reviewer }) {
    const entry = entries.get(keyOf(kind, name));
    if (!entry) return bad('no-entry', 'nothing registered under that kind/name');
    if (!STATES.includes(state)) return bad('bad-state', 'state must be draft, reviewed, or canon');
    if (typeof reviewer !== 'string' || !reviewer.trim()) return bad('no-reviewer', 'reviewer required');
    const cur = STATES.indexOf(entry.reviewState), next = STATES.indexOf(state);
    if (next !== cur + 1) return bad('ladder', 'review moves one rung at a time: draft -> reviewed -> canon');
    if (state === 'canon' && entry.licenseHold) {
      return bad('license-hold', 'license ' + entry.provenance.license + ' is on hold - NOASSERTION/none = STOP, AGPL = separate process (CONTEXT.md license law)');
    }
    entry.reviewState = state;
    entry.reviews = entry.reviews.concat([{ state, reviewer, at: clock() }]);
    append({ op: 'review', kind, name, state, reviews: entry.reviews });
    return ok({ entry });
  }

  function get(kind, name) {
    const entry = entries.get(keyOf(kind, name));
    return entry ? ok({ entry }) : bad('no-entry', 'nothing registered under that kind/name');
  }

  function provenance(kind, name) {
    const entry = entries.get(keyOf(kind, name));
    if (!entry) return bad('no-entry', 'nothing registered under that kind/name');
    return ok({ chain: entry.history.concat([{ version: entry.version, sourceSha: entry.provenance.sourceSha, license: entry.provenance.license, registeredAt: entry.registeredAt }]) });
  }

  function list({ kind, reviewState } = {}) {
    let out = Array.from(entries.values());
    if (kind) out = out.filter(e => e.kind === kind);
    if (reviewState) out = out.filter(e => e.reviewState === reviewState);
    return ok({ entries: out.map(e => ({ kind: e.kind, name: e.name, version: e.version, reviewState: e.reviewState, license: e.provenance.license, licenseHold: e.licenseHold })) });
  }

  function stats() {
    const byKind = {}, byState = {};
    let holds = 0;
    for (const e of entries.values()) {
      byKind[e.kind] = (byKind[e.kind] || 0) + 1;
      byState[e.reviewState] = (byState[e.reviewState] || 0) + 1;
      if (e.licenseHold) holds++;
    }
    return ok({ byKind, byState, holds });
  }

  return { register, review, get, provenance, list, stats };
}

module.exports = { makePauliRegistry };
