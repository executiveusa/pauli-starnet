/* sidecar/pauli-memory.js — Pauli's memory (OpenChronicle + waku-agent patterns port, chunk 2).

   Port of the proven patterns from executiveusa/pauli-OpenChronicle (MIT, upstream Einsia/OpenChronicle
   @ d780c62d - inspectable local memory format + capture pipeline) and executiveusa/pauli-waku-agent
   (MIT, upstream ShenSeanChen/waku-agent @ 8328f567 - semantic/episodic/procedural tiers, consolidation
   gate, deterministic recall evals). See districts/pauli/imports/{openchronicle,waku-agent}/IMPORT.md.

   THREE TIERS, each an append-only JSONL store under <root>/pauli-memory/:
   - EPISODIC  what happened: raw captures with a timestamp. Cheap to write, never authoritative.
   - SEMANTIC  what is known: durable facts. Every entry REQUIRES provenance
               ({ source, sourceRef? }) and carries retrievedAt + a content hash, so recall can
               prove where a fact came from and how old it is. Nothing enters semantic silently:
               facts land only through consolidate() - the GATE - or an explicit provenanced note().
   - PROCEDURAL how things are done: named procedures, version-superseded, never deleted.

   CONSOLIDATION GATE (waku): episodic -> semantic promotion happens ONLY through consolidate(),
   which requires the episodic entry ids being promoted AND a provenance block. There is no
   automatic promotion path - memory never quietly rewrites itself.

   RECALL (OpenChronicle inspectability): recall() returns entries WITH their provenance and marks
   entries older than staleAfterMs as stale:true. Callers see the age; nothing stale is passed off
   as current. recall() never mutates.

   Every ambient dependency is INJECTED (fs, pathMod, clock, crypto) - headless-testable with a real
   temp dir and a fake clock. Storage failures FAIL-OPEN (null/false) - memory must never crash a run.

   makePauliMemory({ fs, pathMod, root, clock, crypto, staleAfterMs? })
     capture({ kind, summary, data? })                                  -> { ok, entry? | error }
     note({ fact, source, sourceRef?, tags? })                          -> { ok, entry? | error }   // provenanced semantic write
     consolidate({ episodicIds, fact, source, sourceRef?, tags? })      -> { ok, entry? | error }   // the gate
     teach({ name, steps, source })                                     -> { ok, entry? | error }   // procedural, supersedes same-name
     recall({ text?, tags?, tier?, limit? })                            -> { ok, entries, asOf }    // provenance attached, stale flagged
     stats()                                                            -> { episodic, semantic, procedural } */
'use strict';

const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function makePauliMemory(deps) {
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock, crypto = deps.crypto;
  const root = deps.root;
  if (!fs || !pathMod || typeof clock !== 'function' || !crypto || !root) throw new Error('pauli-memory: fs, pathMod, root, clock, crypto are required');
  const staleAfterMs = typeof deps.staleAfterMs === 'number' ? deps.staleAfterMs : 7 * 24 * 3600 * 1000;
  const dir = pathMod.join(root, 'pauli-memory');
  const files = {
    episodic: pathMod.join(dir, 'episodic.jsonl'),
    semantic: pathMod.join(dir, 'semantic.jsonl'),
    procedural: pathMod.join(dir, 'procedural.jsonl')
  };

  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });

  function ensureDir() { try { fs.mkdirSync(dir, { recursive: true }); return true; } catch (_) { return false; } }

  function hash(text) { return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex'); }

  function append(file, entry) {
    try { ensureDir(); fs.appendFileSync(file, JSON.stringify(entry) + '\n'); return true; } catch (_) { return false; }
  }

  function readAll(file) {
    const out = [];
    try {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line) continue;
        try { out.push(JSON.parse(line)); } catch (_) { /* torn tail ignored */ }
      }
    } catch (_) { /* missing file = empty tier */ }
    return out;
  }

  function seqOf(file) { return readAll(file).length; }

  function capture(input) {
    const summary = String((input && input.summary) || '').trim();
    if (!summary) return bad('BAD_CAPTURE', 'a capture needs a summary');
    const entry = {
      id: 'ep' + (seqOf(files.episodic) + 1),
      kind: String((input && input.kind) || 'observation').trim() || 'observation',
      summary, data: input && input.data != null ? input.data : null,
      at: clock()
    };
    if (!append(files.episodic, entry)) return bad('STORE_FAILED', 'could not persist capture');
    return ok({ entry });
  }

  function requireProvenance(input) {
    const source = String((input && input.source) || '').trim();
    if (!source) return null;
    return { source, sourceRef: input && input.sourceRef != null ? String(input.sourceRef) : null, retrievedAt: clock() };
  }

  function semanticEntry(fact, prov, tags) {
    return {
      id: 'sm' + (seqOf(files.semantic) + 1),
      fact: String(fact).trim(),
      hash: hash(fact),
      provenance: prov,
      tags: Array.isArray(tags) ? tags.map(String) : [],
      at: clock()
    };
  }

  function note(input) {
    const fact = String((input && input.fact) || '').trim();
    if (!fact) return bad('BAD_FACT', 'a note needs a fact');
    const prov = requireProvenance(input);
    if (!prov) return bad('NO_PROVENANCE', 'semantic memory requires a source - nothing enters silently');
    const entry = semanticEntry(fact, prov, input && input.tags);
    if (!append(files.semantic, entry)) return bad('STORE_FAILED', 'could not persist note');
    return ok({ entry });
  }

  function consolidate(input) {
    const ids = Array.isArray(input && input.episodicIds) ? input.episodicIds.map(String) : [];
    if (!ids.length) return bad('GATE', 'consolidation names the episodic entries it promotes');
    const episodic = readAll(files.episodic);
    const missing = ids.filter(id => !episodic.some(e => e.id === id));
    if (missing.length) return bad('GATE', 'unknown episodic ids: ' + missing.join(', '));
    const fact = String((input && input.fact) || '').trim();
    if (!fact) return bad('BAD_FACT', 'consolidation needs the promoted fact');
    const prov = requireProvenance(input);
    if (!prov) return bad('NO_PROVENANCE', 'the gate requires a source - memory never rewrites itself silently');
    const entry = semanticEntry(fact, prov, input && input.tags);
    entry.consolidatedFrom = ids.slice();
    if (!append(files.semantic, entry)) return bad('STORE_FAILED', 'could not persist consolidation');
    return ok({ entry });
  }

  function teach(input) {
    const name = String((input && input.name) || '').trim();
    if (!SLUG.test(name)) return bad('BAD_NAME', 'procedure name must be a lowercase slug');
    const steps = Array.isArray(input && input.steps) ? input.steps.map(String).map(s => s.trim()).filter(Boolean) : [];
    if (!steps.length) return bad('BAD_STEPS', 'a procedure needs steps');
    const source = String((input && input.source) || '').trim();
    if (!source) return bad('NO_PROVENANCE', 'a procedure names where it was learned');
    const prior = readAll(files.procedural).filter(p => p.name === name);
    const entry = {
      id: 'pr' + (seqOf(files.procedural) + 1),
      name, version: prior.length + 1, steps, source,
      supersedes: prior.length ? prior[prior.length - 1].id : null,
      at: clock()
    };
    if (!append(files.procedural, entry)) return bad('STORE_FAILED', 'could not persist procedure');
    return ok({ entry });
  }

  function recall(query) {
    const q = query || {};
    const text = String(q.text || '').trim().toLowerCase();
    const wantTags = Array.isArray(q.tags) ? q.tags.map(String) : null;
    const limit = Number.isInteger(q.limit) && q.limit > 0 ? q.limit : 20;
    const tiers = q.tier ? [String(q.tier)] : ['semantic', 'episodic', 'procedural'];
    const asOf = clock();
    const entries = [];
    const stamp = (e, tier, body) => {
      const out = Object.assign({}, e, { tier });
      if (tier === 'semantic') out.stale = (asOf - e.at) > staleAfterMs;
      if (tier === 'procedural') out.current = body;
      return out;
    };
    if (tiers.includes('semantic')) {
      for (const e of readAll(files.semantic)) {
        if (text && !(e.fact.toLowerCase().includes(text) || e.tags.some(t => t.toLowerCase().includes(text)))) continue;
        if (wantTags && !wantTags.some(t => e.tags.includes(t))) continue;
        entries.push(stamp(e, 'semantic'));
      }
    }
    if (tiers.includes('episodic') && !wantTags) {
      for (const e of readAll(files.episodic)) {
        if (text && !e.summary.toLowerCase().includes(text)) continue;
        entries.push(stamp(e, 'episodic'));
      }
    }
    if (tiers.includes('procedural')) {
      const latestByName = {};
      for (const p of readAll(files.procedural)) latestByName[p.name] = p;
      const currentIds = new Set(Object.values(latestByName).map(p => p.id));
      for (const p of readAll(files.procedural)) {
        if (wantTags) continue;
        if (text && !(p.name.includes(text) || p.steps.some(s => s.toLowerCase().includes(text)))) continue;
        entries.push(stamp(p, 'procedural', currentIds.has(p.id)));
      }
    }
    entries.sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : 1));
    return ok({ entries: entries.slice(0, limit), asOf });
  }

  function stats() {
    return { episodic: readAll(files.episodic).length, semantic: readAll(files.semantic).length, procedural: readAll(files.procedural).length };
  }

  return Object.freeze({ capture, note, consolidate, teach, recall, stats });
}

module.exports = { makePauliMemory };
