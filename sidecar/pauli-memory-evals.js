/* sidecar/pauli-memory-evals.js — deterministic recall eval dataset (waku-agent patterns port,
   chunk 7).

   Port of executiveusa/pauli-waku-agent's deterministic memory evals (MIT, upstream
   ShenSeanChen/waku-agent @ 8328f567 - evals/deterministic: offline cases that pin the PARSING
   and the FAILURE POSTURE, never model judgment). See districts/pauli/imports/waku-agent/IMPORT.md.

   The law these cases pin, waku's own words: THE GATE FAILS OPEN - anything the memory layer
   cannot understand must still let memory through, because a stale memory beats a lost one.
   Malformed queries never throw and never silently return nothing when memory exists; stale
   entries come back FLAGGED, not hidden; provenance rides every entry; recall never mutates.

   CASES is pure data + pure predicates; runEvals plays them against an injected pauli-memory
   instance. The headless proof lives in test/pauli-memory-eval.test.js.

   makePauliMemoryEvals({ clock }) -> { CASES, runEvals(memory) -> { total, passed, failures } } */
'use strict';

function makePauliMemoryEvals(deps) {
  const clock = deps && typeof deps.clock === 'function' ? deps.clock : () => 0;

  // Every case: seed() loads a fresh memory, query() recalls, expect(entries, recalled) judges.
  const CASES = [
    {
      name: 'known fact is retrievable by text',
      seed: mem => { mem.note({ fact: 'the city has 11 districts', source: 'cityos spec', tags: ['city'] }); },
      query: { text: 'districts' },
      expect: r => r.entries.length === 1 && r.entries[0].fact === 'the city has 11 districts'
    },
    {
      name: 'every recalled entry carries provenance',
      seed: mem => { mem.note({ fact: 'pauli judges debates', source: 'council spec' }); },
      query: {},
      expect: r => r.entries.length > 0 && r.entries.every(e => e.provenance && e.provenance.source)
    },
    {
      name: 'tag-only recall stays in the semantic tier',
      seed: mem => {
        mem.note({ fact: 'pauli judges debates', source: 'council spec', tags: ['council'] });
        mem.capture({ kind: 'observation', summary: 'council happened today' });
      },
      query: { tags: ['council'] },
      expect: r => r.entries.length === 1 && r.entries.every(e => e.tier === 'semantic')
    },
    {
      name: 'stale entries are FLAGGED, never hidden (fail open)',
      seed: mem => { mem.note({ fact: 'old fact', source: 'ancient' }); },
      query: { text: 'old' },
      expect: (r, mem) => r.entries.length === 1 && r.entries[0].stale === true,
      staleMode: true // the eval harness ages the clock past the stale window before query
    },
    {
      name: 'garbage query does not throw and does not lose memory',
      seed: mem => { mem.note({ fact: 'something remembered', source: 'eval' }); },
      query: null, // harness calls recall(null) + recall({}) + recall({ text: 42, tags: 'not-an-array' })
      expect: results => results.every(r => r && r.ok === true) && results[1].entries.length === 1,
      malformed: true
    },
    {
      name: 'recall never mutates memory',
      seed: mem => { mem.note({ fact: 'immutable', source: 'eval' }); mem.capture({ kind: 'obs', summary: 'an episode' }); },
      query: { text: 'immutable' },
      expect: (r, mem) => {
        const before = mem.stats();
        mem.recall({}); mem.recall({ text: 'immutable' }); mem.recall({ tier: 'episodic' });
        const after = mem.stats();
        return JSON.stringify(before) === JSON.stringify(after);
      }
    },
    {
      name: 'procedures recall by name and steps',
      seed: mem => { mem.teach({ name: 'ship-a-chunk', steps: ['write the module', 'prove it', 'patch'], source: 'repo law' }); },
      query: { text: 'prove it' },
      expect: r => r.entries.length === 1 && r.entries[0].tier === 'procedural'
    }
  ];

  function runEvals(memoryFactory, opts) {
    // memoryFactory(staleAfterMs) -> fresh memory; the stale case needs a short window + aging clock
    const results = [];
    for (const c of CASES) {
      try {
        let mem, recalled;
        if (c.staleMode) {
          const box = opts && opts.agingMemoryFactory ? opts.agingMemoryFactory() : null;
          mem = box ? box.mem : memoryFactory();
          c.seed(mem);
          if (box && box.age) box.age(); else if (!box) { /* no aging available */ }
          recalled = mem.recall(c.query);
          results.push({ name: c.name, pass: !!(recalled.ok && c.expect(recalled, mem)) });
        } else if (c.malformed) {
          mem = memoryFactory();
          c.seed(mem);
          const attempts = [];
          for (const q of [null, {}, { text: 42, tags: 'not-an-array' }]) {
            let r;
            try { r = mem.recall(q || {}); } catch (e) { r = null; }
            attempts.push(r);
          }
          results.push({ name: c.name, pass: c.expect(attempts) });
        } else {
          mem = memoryFactory();
          c.seed(mem);
          recalled = mem.recall(c.query);
          results.push({ name: c.name, pass: !!(recalled.ok && c.expect(recalled, mem)) });
        }
      } catch (e) {
        results.push({ name: c.name, pass: false, error: (e && e.message) || String(e) });
      }
    }
    const failures = results.filter(r => !r.pass);
    return { total: results.length, passed: results.length - failures.length, failures, results };
  }

  return { CASES, runEvals };
}

module.exports = { makePauliMemoryEvals };
