/* pauli-memory (chunk 2: OpenChronicle + waku port) — headless proof: three tiers persist;
   semantic writes REQUIRE provenance; consolidation is a gate (names its episodic ids, refuses
   unknown ones, requires a source); recall returns provenance + flags stale; procedures
   version-supersede with only the newest marked current; everything survives a "restart". */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliMemory } = require('../sidecar/pauli-memory.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-memory-test-'));
let now = 10000;
const clock = () => now;
const STALE = 1000;
const mk = () => makePauliMemory({ fs, pathMod: path, root, clock, crypto, staleAfterMs: STALE });

let mem = mk();
A.eq(mem.stats(), { episodic: 0, semantic: 0, procedural: 0 }, 'empty at boot');

// episodic capture
A.ok(!mem.capture({ summary: ' ' }).ok, 'empty capture refused');
A.eq(mem.capture({ kind: 'observation', summary: 'owner asked about the council' }).ok, true, 'capture lands');
A.eq(mem.capture({ kind: 'tool', summary: 'ran the census', data: { repos: 115 } }).ok, true, 'second capture lands');
A.eq(mem.stats().episodic, 2, 'episodic persists both');

// semantic requires provenance
A.ok(!mem.note({ fact: 'the city has 11 districts' }).ok, 'semantic write without a source refused');
const noted = mem.note({ fact: 'the city has 11 districts', source: 'cityos spec execution', sourceRef: 'test/cityos.test.js', tags: ['city'] });
A.ok(noted.ok, 'provenanced note lands');
A.ok(noted.entry.hash && noted.entry.hash.length === 64, 'fact carries a content hash');
A.eq(noted.entry.provenance.retrievedAt, 10000, 'provenance carries retrieval time');

// consolidation gate
A.ok(!mem.consolidate({ episodicIds: [], fact: 'x', source: 's' }).ok, 'gate refuses unnamed episodic ids');
A.ok(!mem.consolidate({ episodicIds: ['ep99'], fact: 'x', source: 's' }).ok, 'gate refuses unknown episodic ids');
A.ok(!mem.consolidate({ episodicIds: ['ep1'], fact: 'council was discussed', }).ok, 'gate refuses missing provenance');
const gated = mem.consolidate({ episodicIds: ['ep1', 'ep2'], fact: 'owner wants the council venue built', source: 'owner whatsapp', sourceRef: 'wamid.test', tags: ['owner'] });
A.ok(gated.ok, 'gate promotes with ids + provenance');
A.eq(gated.entry.consolidatedFrom, ['ep1', 'ep2'], 'promotion names its evidence');

// procedural tiers version-supersede
A.ok(!mem.teach({ name: 'deploy', steps: [], source: 'x' }).ok, 'procedure needs steps');
A.ok(!mem.teach({ name: 'deploy', steps: ['apply patch'], }).ok, 'procedure needs a learned-from source');
A.eq(mem.teach({ name: 'deploy', steps: ['apply patch', 'run tests'], source: 'watcher runbook' }).ok, true, 'procedure v1 lands');
A.eq(mem.teach({ name: 'deploy', steps: ['apply patch', 'run tests', 'report sha'], source: 'watcher runbook v2' }).ok, true, 'procedure v2 lands');
const procs = mem.recall({ tier: 'procedural' }).entries;
A.eq(procs.length, 2, 'both versions recallable');
A.eq(procs.filter(p => p.current).length, 1, 'only the newest is current');
A.eq(procs.find(p => p.current).version, 2, 'v2 is current');
A.eq(procs.find(p => !p.current).supersedes, null, 'v1 superseded nothing');

// recall: provenance attached, stale flagged, nothing invented
now = 10000 + STALE + 1;
const r = mem.recall({ text: 'districts' });
A.eq(r.entries.length, 1, 'text recall finds the fact');
A.eq(r.entries[0].tier, 'semantic', 'fact comes from semantic');
A.eq(r.entries[0].stale, true, 'old fact is flagged stale - never passed off as current');
A.eq(r.entries[0].provenance.source, 'cityos spec execution', 'recall carries provenance');
A.eq(r.asOf, now, 'recall reports as-of');
A.eq(mem.recall({ tags: ['owner'] }).entries.length, 1, 'tag recall finds the gated fact');
A.eq(mem.recall({ text: 'nothing matches this' }).entries.length, 0, 'miss returns empty, never invented');

// durability across a "restart"
mem = mk();
A.eq(mem.stats(), { episodic: 2, semantic: 2, procedural: 2 }, 'all tiers survive a fresh memory over the same dir');
A.eq(mem.recall({ tier: 'procedural' }).entries.filter(p => p.current)[0].version, 2, 'current version survives restart');

A.report('pauli-memory');
