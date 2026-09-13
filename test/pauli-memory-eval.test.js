/* pauli-memory eval dataset (chunk 7, waku port) — headless proof: the deterministic eval cases
   run against pauli-memory and ALL PASS, pinning the recall contract + the fail-open law (a stale
   memory beats a lost one). Also proves the dataset itself is real: a deliberately broken memory
   stub FAILS the evals, so green means the cases have teeth. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliMemory } = require('../sidecar/pauli-memory.js');
const { makePauliMemoryEvals } = require('../sidecar/pauli-memory-evals.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-memory-eval-test-'));
let counter = 0;
const mkFresh = staleAfterMs => {
  const dir = fs.mkdtempSync(path.join(root, 'case-'));
  return makePauliMemory({ fs, pathMod: path, root: dir, clock: () => 1000, crypto, staleAfterMs: staleAfterMs || 5000 });
};
const agingMemoryFactory = () => {
  let now = 1000;
  const dir = fs.mkdtempSync(path.join(root, 'aging-'));
  const mem = makePauliMemory({ fs, pathMod: path, root: dir, clock: () => now, crypto, staleAfterMs: 5000 });
  return { mem, age: () => { now += 6000; } }; // past the stale window
};

const evals = makePauliMemoryEvals({ clock: () => 1000 });
A.eq(evals.CASES.length, 7, 'seven deterministic cases');
const run = evals.runEvals(() => mkFresh(), { agingMemoryFactory });
A.eq(run.failures, [], 'all cases pass against pauli-memory: ' + JSON.stringify(run.failures));
A.eq(run.passed, run.total, 'every case accounted for');

// the dataset has teeth: a broken memory (recall drops everything) fails loudly
const broken = { recall: () => ({ ok: true, entries: [] }), stats: () => ({}), note: () => ({ ok: true }), capture: () => ({ ok: true }), teach: () => ({ ok: true }) };
const brokenRun = evals.runEvals(() => broken, { agingMemoryFactory: () => ({ mem: broken, age: () => {} }) });
A.ok(brokenRun.failures.length >= 4, 'a memory that loses everything fails the evals (' + brokenRun.failures.length + ' failures)');

A.report();
