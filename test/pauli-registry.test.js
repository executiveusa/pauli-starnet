/* pauli-registry (chunk 4: paperclip port) — headless proof: one registry for agents/skills/tools;
   provenance (source + sourceSha + license) is REQUIRED, no rumors; review ladder draft->reviewed->canon
   one rung at a time; license law holds NOASSERTION/none/AGPL out of canon; re-registration supersedes
   with full provenance history; state survives a "restart" via JSONL replay; storage fails open. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliRegistry } = require('../sidecar/pauli-registry.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-registry-test-'));
let now = 50000;
const clock = () => now;
const mk = () => makePauliRegistry({ fs, pathMod: path, root, clock, crypto });

let reg = mk();

// provenance-required (IMPORT.md: entry without source SHA rejected)
A.ok(!reg.register({ kind: 'agent', name: 'pauli' }).ok, 'no provenance at all refused');
A.ok(!reg.register({ kind: 'agent', name: 'pauli', source: 'executiveusa/pauli-starnet', license: 'MIT' }).ok, 'missing sourceSha refused');
A.ok(!reg.register({ kind: 'agent', name: 'pauli', source: 'executiveusa/pauli-starnet', sourceSha: 'b291a6f' }).ok, 'missing license refused');
A.ok(!reg.register({ kind: 'agent', name: 'pauli', sourceSha: 'b291a6f', license: 'MIT' }).ok, 'missing source refused');
A.ok(!reg.register({ kind: 'gizmo', name: 'x', source: 's', sourceSha: 'sha', license: 'MIT' }).ok, 'unknown kind refused');

// roundtrip across all three kinds
const agent = reg.register({ kind: 'agent', name: 'pauli', source: 'executiveusa/pauli-starnet', sourceSha: 'b291a6f', license: 'MIT', meta: { lane: 'architect-judge' } });
A.eq(agent.ok, true, 'agent registers with full provenance');
A.eq(agent.entry.reviewState, 'draft', 'new entries start draft');
A.eq(agent.entry.licenseHold, false, 'MIT carries no hold');
A.eq(reg.register({ kind: 'skill', name: 'council-debate', source: 'executiveusa/PAULIS-PLACE', sourceSha: '328e3aee', license: 'MIT' }).ok, true, 'skill registers');
A.eq(reg.register({ kind: 'tool', name: 'supervisor', source: 'executiveusa/pauli-firstmate', sourceSha: '0e31b0a0', license: 'MIT' }).ok, true, 'tool registers');
A.eq(reg.get('agent', 'pauli').entry.meta.lane, 'architect-judge', 'get round-trips meta');
A.ok(!reg.get('agent', 'nobody').ok, 'unknown entry is a clean miss');

// review ladder
A.ok(!reg.review({ kind: 'agent', name: 'pauli', state: 'canon', reviewer: 'watcher' }).ok, 'draft cannot jump to canon');
A.ok(!reg.review({ kind: 'agent', name: 'pauli', state: 'reviewed' }).ok, 'review without reviewer refused');
A.ok(!reg.review({ kind: 'agent', name: 'nobody', state: 'reviewed', reviewer: 'watcher' }).ok, 'cannot review a miss');
now += 1000;
A.eq(reg.review({ kind: 'agent', name: 'pauli', state: 'reviewed', reviewer: 'watcher' }).ok, true, 'draft -> reviewed');
A.eq(reg.review({ kind: 'agent', name: 'pauli', state: 'canon', reviewer: 'bambu' }).ok, true, 'reviewed -> canon');
A.eq(reg.get('agent', 'pauli').entry.reviews.length, 2, 'review trail recorded');
A.ok(!reg.review({ kind: 'agent', name: 'pauli', state: 'canon', reviewer: 'x' }).ok, 'canon is the top rung');

// license law: NOASSERTION / none / AGPL never reach canon
reg.register({ kind: 'tool', name: 'vibe-cockpit-ui', source: 'executiveusa/vibe_cockpit', sourceSha: '09778c97', license: 'NOASSERTION' });
reg.register({ kind: 'skill', name: 'agpl-thing', source: 'upstream/x', sourceSha: 'abc', license: 'AGPL-3.0' });
A.eq(reg.get('tool', 'vibe-cockpit-ui').entry.licenseHold, true, 'NOASSERTION flagged on hold');
A.eq(reg.get('skill', 'agpl-thing').entry.licenseHold, true, 'AGPL flagged on hold');
A.eq(reg.review({ kind: 'tool', name: 'vibe-cockpit-ui', state: 'reviewed', reviewer: 'watcher' }).ok, true, 'held entries can be reviewed');
A.ok(!reg.review({ kind: 'tool', name: 'vibe-cockpit-ui', state: 'canon', reviewer: 'bambu' }).ok, 'NOASSERTION can never reach canon (STOP)');
reg.review({ kind: 'skill', name: 'agpl-thing', state: 'reviewed', reviewer: 'watcher' });
A.ok(!reg.review({ kind: 'skill', name: 'agpl-thing', state: 'canon', reviewer: 'bambu' }).ok, 'AGPL can never reach canon (separate process)');

// re-registration supersedes, provenance history kept
now += 1000;
const v2 = reg.register({ kind: 'tool', name: 'supervisor', source: 'executiveusa/pauli-firstmate', sourceSha: 'ff00ff00', license: 'MIT' });
A.eq(v2.entry.version, 2, 're-registration bumps version');
A.eq(v2.entry.reviewState, 'draft', 'new version restarts the ladder');
const chain = reg.provenance('tool', 'supervisor').chain;
A.eq(chain.length, 2, 'provenance chain keeps both versions');
A.eq(chain[0].sourceSha, '0e31b0a0', 'history preserves the first SHA');
A.eq(chain[1].sourceSha, 'ff00ff00', 'current version heads the chain');

// list + stats
A.eq(reg.list({ kind: 'tool' }).entries.length, 2, 'list filters by kind');
A.eq(reg.list({ reviewState: 'canon' }).entries.map(e => e.name), ['pauli'], 'list filters by state');
const st = reg.stats();
A.eq(st.byKind, { agent: 1, skill: 2, tool: 2 }, 'stats by kind');
A.eq(st.holds, 2, 'stats counts license holds');

// persistence across restart
reg = mk();
A.eq(reg.get('agent', 'pauli').entry.reviewState, 'canon', 'replay restores review state');
A.eq(reg.get('agent', 'pauli').entry.reviews.length, 2, 'replay restores the review trail');
A.eq(reg.provenance('tool', 'supervisor').chain.length, 2, 'replay restores provenance history');

// fail-open storage
const dead = makePauliRegistry({ fs, pathMod: path, root: path.join(root, 'no', '\0', 'dir'), clock, crypto });
A.eq(dead.register({ kind: 'agent', name: 'x', source: 's', sourceSha: 'sha', license: 'MIT' }).ok, true, 'registration stands even when the log cannot be written');

A.report();
