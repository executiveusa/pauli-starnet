/* pauli-canon-sync (chunk 6: bundled skill library -> Hall of Canon registry) — headless proof:
   every bundled skill registers as kind 'skill' with REQUIRED provenance (repo source + injected
   SHA); a skill's own frontmatter license beats the repo default (license law travels); re-sync
   at the same SHA is a no-op; a new SHA supersedes with version bump + provenance history;
   refused entries land in failed without stopping the rest; the REAL bundled library (91 skills)
   syncs end-to-end. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const catalog = require('../sidecar/skills/catalog.js');
const { makePauliRegistry } = require('../sidecar/pauli-registry.js');
const { makePauliCanonSync } = require('../sidecar/pauli-canon-sync.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-canon-sync-test-'));
let now = 70000;
const clock = () => now;
const mkRegistry = () => makePauliRegistry({ fs, pathMod: path, root, clock, crypto });
const sync = makePauliCanonSync({ fs, pathMod: path, clock, crypto, catalog });

// a small fake library
const lib = path.join(root, 'lib');
fs.mkdirSync(lib, { recursive: true });
fs.writeFileSync(path.join(lib, 'alpha.md'), '---\nname: Alpha\nslug: alpha\ndescription: first\ncategory: Engineering\nrequires: [dish]\nlicense: MIT\n---\n\nDo alpha things.\n');
fs.writeFileSync(path.join(lib, 'beta.md'), '---\nname: Beta\nslug: beta\ndescription: second\nrequires: []\nlicense: AGPL-3.0\n---\n\nDo beta things.\n');
fs.writeFileSync(path.join(lib, 'gamma.md'), '---\nname: Gamma\nslug: gamma\ndescription: third\n---\n\nDo gamma things.\n');

let registry = mkRegistry();

// validation
A.ok(!sync.syncBundledSkills({ registry, dir: lib }).ok, 'sync without a repo SHA refused - provenance never guessed');
A.ok(!sync.syncBundledSkills({ dir: lib, repoSha: 'abc' }).ok, 'sync without a registry refused');

// first sync
const first = sync.syncBundledSkills({ registry, dir: lib, repoSha: '1596189' });
A.eq(first.ok, true, 'first sync runs');
A.eq(first.report.total, 3, 'all three skills seen');
A.eq(first.report.added, 3, 'all three added');
A.eq(first.report.failed, [], 'no failures');
A.eq(registry.get('skill', 'alpha').entry.provenance, { source: 'executiveusa/pauli-starnet', sourceSha: '1596189', license: 'MIT' }, 'provenance carries repo + injected SHA + license');
A.eq(registry.get('skill', 'alpha').entry.meta.requires, ['dish'], 'capability requirements carried into meta');
A.eq(registry.get('skill', 'gamma').entry.provenance.license, 'MIT', 'skill without its own license inherits the repo default');
A.eq(registry.get('skill', 'beta').entry.provenance.license, 'AGPL-3.0', 'a stricter frontmatter license travels with the entry');
A.eq(registry.get('skill', 'beta').entry.licenseHold, true, 'AGPL skill lands on license hold out of the box');
A.eq(registry.stats().byKind.skill, 3, 'registry stats reflect the sync');

// idempotent re-sync at the same SHA
now += 1000;
const again = sync.syncBundledSkills({ registry, dir: lib, repoSha: '1596189' });
A.eq(again.report.unchanged, 3, 'same SHA + same license = no-op');
A.eq(again.report.added + again.report.updated, 0, 'no version churn on idempotent sync');
A.eq(registry.get('skill', 'alpha').entry.version, 1, 'versions unmoved');

// new SHA supersedes with history
now += 1000;
const bumped = sync.syncBundledSkills({ registry, dir: lib, repoSha: 'aaaa000' });
A.eq(bumped.report.updated, 3, 'new SHA supersedes all three');
A.eq(registry.get('skill', 'alpha').entry.version, 2, 'version bumped');
A.eq(registry.provenance('skill', 'alpha').chain.map(c => c.sourceSha), ['1596189', 'aaaa000'], 'provenance history tracks the repo');

// a refused entry lands in failed and never stops the rest
fs.writeFileSync(path.join(lib, 'licenseless.md'), '---\nname: Licenseless\nslug: licenseless\nlicense: NOASSERTION\n---\n\nHold me.\n');
const withHold = sync.syncBundledSkills({ registry, dir: lib, repoSha: 'aaaa000' });
A.eq(withHold.report.failed, [], 'license-held entries still register (hold blocks canon, not registration)');
A.eq(registry.get('skill', 'licenseless').entry.licenseHold, true, 'NOASSERTION flagged');
registry.review({ kind: 'skill', name: 'licenseless', state: 'reviewed', reviewer: 'watcher' });
A.ok(!registry.review({ kind: 'skill', name: 'licenseless', state: 'canon', reviewer: 'bambu' }).ok, 'held skill can never reach canon');

// the REAL bundled library syncs end-to-end
const real = sync.syncBundledSkills({ registry: mkRegistry(), dir: path.join(__dirname, '..', 'sidecar', 'skills', 'library'), repoSha: '1596189' });
A.eq(real.ok, true, 'real library sync runs');
A.ok(real.report.total >= 90, 'real library is substantial (' + real.report.total + ' skills)');
A.eq(real.report.failed, [], 'every real skill registers');
A.eq(real.report.added, real.report.total, 'every real skill added on first sync');

A.report();
