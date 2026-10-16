/* first-lanes.test.js — Production, Impact and Commerce lanes (program/city-247/04_first_lanes).
   The seeded queue is valid and safe (nothing pre-approved), the seeder is idempotent, the foreman reads the
   seeded work the way the owner should see it, and the Etsy builder prepares payloads but refuses unsafe ones.
   Run: node test/first-lanes.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const path = require('path');
const F = require('../sidecar/district-foreman.js');
const { makeSeeder } = require('../scripts/queue/seed.js');
const { buildDraftListing, renderListingFile } = require('../districts/commerce/etsy/listing.js');

const ROOT = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'program', 'city-247', '04_first_lanes', 'seed-issues.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'districts.json'), 'utf8'));

(async () => {
  // ---- the seeded queue ----
  const active = new Set(registry.districts.filter(d => d.active).map(d => d.id));
  const labelNames = new Set(spec.labels.map(l => l.name));
  A.eq(spec.repo, registry.districts.find(d => d.id === 'impact').queue.repo, 'seeds go to the queue repo the registry names');
  for (const it of spec.issues) {
    const d = it.labels.find(l => l.startsWith('district:'));
    A.ok(d && active.has(d.slice(9)), it.title + ': belongs to an active lane');
    A.ok(!it.labels.includes('approved'), it.title + ': is not pre-approved (a person approves)');
    A.ok(it.labels.every(l => labelNames.has(l)), it.title + ': uses only labels the seed creates');
    A.ok(it.labels.includes('blocked') ? /^Question: /m.test(it.body) : /Deliver: /.test(it.body), it.title + ': says what it delivers, or asks its question');
  }
  for (const id of ['production', 'impact', 'commerce']) A.ok(spec.issues.some(i => i.labels.includes('district:' + id)), id + ' has seeded work');

  // ---- what the foreman will say about it ----
  let n = 100;
  const issues = spec.issues.map(i => ({ number: ++n, title: i.title, body: i.body, created_at: '2026-10-15T00:00:00Z', labels: i.labels.map(name => ({ name })) }));
  const items = issues.map(F.itemFromIssue);
  const board = Object.fromEntries(F.decide({ districts: registry.districts, items, state: {}, now: Date.parse('2026-10-15T12:00:00Z') }).map(d => [d.district, d]));
  A.ok(board.impact.action === 'BLOCKED' && /^Approve #101 "Verify the Google programs/.test(board.impact.question), 'Impact asks the owner to approve its first item');
  A.ok(board.production.action === 'BLOCKED' && /Approve #/.test(board.production.question), 'Production asks for approval');
  A.ok(board.commerce.action === 'BLOCKED' && /decide 0002, 0004 and 0009/.test(board.commerce.question), 'Commerce surfaces the store decisions it is blocked on');
  items[0].approved = true;
  A.eq(F.decide({ districts: registry.districts, items, state: {}, now: Date.parse('2026-10-15T12:00:00Z') }).find(d => d.district === 'impact').action, 'DISPATCH', 'once approved, Impact runs it');

  // ---- seeder: creates what is missing, once ----
  const repo = { labels: [{ name: 'approved' }], issues: [{ title: spec.issues[1].title }] };
  const writes = [];
  const fetchImpl = async (url, init = {}) => {
    const u = url.replace('https://api.github.com', '');
    let body = [];
    if ((init.method || 'GET') === 'POST') {
      const b = JSON.parse(init.body); writes.push({ u, b });
      if (/\/labels$/.test(u)) repo.labels.push({ name: b.name }); else repo.issues.push({ title: b.title });
      body = { number: 900 + writes.length };
    } else if (/\/labels\?/.test(u)) body = repo.labels;
    else if (/\/issues\?/.test(u)) body = repo.issues;
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  };
  const seeder = makeSeeder({ env: { GITHUB_TOKEN: 't' }, fetchImpl });
  const dry = await seeder.seed(spec, { dryRun: true });
  A.ok(writes.length === 0 && dry.issues_created.length === spec.issues.length - 1, 'dry run writes nothing and reports what it would create');
  const r1 = await seeder.seed(spec);
  A.ok(r1.labels_created.length === spec.labels.length - 1 && r1.issues_created.length === spec.issues.length - 1 && r1.skipped.length === 1, 'first run creates the missing labels and issues, skips the existing one');
  const r2 = await seeder.seed(spec);
  A.ok(r2.labels_created.length === 0 && r2.issues_created.length === 0, 'second run creates nothing (idempotent)');
  A.ok(writes.filter(w => /\/issues$/.test(w.u)).every(w => !w.b.labels.includes('approved')), 'no seeded issue carries approved');
  let refused = false;
  try { await seeder.seed({ repo: 'o/r', labels: [], issues: [{ title: 'x', body: 'y', labels: ['approved'] }] }); } catch (_) { refused = true; }
  A.ok(refused, 'a spec with a pre-approved issue is refused');
  const off = makeSeeder({ env: {}, fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ has_issues: false }) }) });
  let offMsg = '';
  try { await off.seed(spec); } catch (e) { offMsg = e.message; }
  A.ok(/Issues are disabled on executiveusa\/pauli-starnet: enable them/.test(offMsg), 'a repo with Issues off stops the seed with the exact setting to change');

  // ---- Commerce: Etsy payloads, prepare only ----
  const design = { id: 'design-001', title: 'Free Speech Is For Everyone Tee', description: 'Original typographic design.', tags: ['free speech', 'first amendment'], gate: 'pass', gate_ref: 'stages/03_gate/output/gate-001.md', built_by: 'designer-a', verified_by: 'verifier-b' };
  const cfg = { price: 24, taxonomy_id: 482, shipping_profile_id: 1, readiness_state_id: 2, production_partner_ids: [7], banned_terms: ['nike'] };
  const ok = buildDraftListing(design, cfg);
  A.ok(ok.ok && ok.payload.state === 'draft' && ok.payload.who_made === 'i_did' && ok.payload.when_made === 'made_to_order' && ok.payload.should_auto_renew === false, 'a gated, verified design becomes a draft payload');
  A.ok(/not published/.test(renderListingFile(1, ok)) && /listing-001/.test(renderListingFile(1, ok)), 'the stage 04 file says it is a draft, not published');
  const noGate = buildDraftListing({ ...design, gate: 'fail' }, cfg);
  A.ok(!noGate.ok && noGate.errors.some(e => /not passed the store gate/.test(e)), 'no gate pass, no payload');
  A.ok(buildDraftListing({ ...design, verified_by: 'designer-a' }, cfg).errors.some(e => /verified by someone other/.test(e)), 'self-verified designs are refused');
  A.ok(buildDraftListing(design, { ...cfg, price: 0 }).errors.some(e => /price/.test(e)), 'no owner price, no payload');
  A.ok(buildDraftListing(design, { ...cfg, production_partner_ids: [] }).errors.some(e => /production partner/.test(e)), 'print-on-demand must disclose its production partner');
  A.ok(buildDraftListing({ ...design, tags: ['nike style'] }, cfg).errors.some(e => /banned term/.test(e)), 'legal-line banned terms are refused');
  A.ok(buildDraftListing({ ...design, tags: Array(14).fill('t') }, cfg).errors.some(e => /13 tags/.test(e)), 'Etsy tag limits are enforced');
  A.ok(/NOT READY/.test(renderListingFile(2, noGate)), 'a refused payload renders as NOT READY');
  const src = fs.readFileSync(path.join(ROOT, 'districts', 'commerce', 'etsy', 'listing.js'), 'utf8');
  A.ok(!/fetch\(|require\('https?'\)|XMLHttpRequest/.test(src), 'the Etsy module has no network code');

  A.report('first-lanes.test');
})().catch(e => { console.error(e); process.exit(1); });
