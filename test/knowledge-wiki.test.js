/* knowledge-wiki.test.js — the compiled wiki layer (knowledge/wiki/SCHEMA.md).
   Unit: frontmatter parsing, the lint (real repo + a broken fixture), and the gateway's wiki merge
   on both backends. Run: node test/knowledge-wiki.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const W = require('../scripts/knowledge/wiki.js');
const { makeKnowledgeDesk } = require('../gateway/knowledge.js');

const ROOT = path.join(__dirname, '..');

function write(root, rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

(async () => {
  // ---- parsePage ----
  const good = W.parsePage('x', '---\ntitle: T\nupdated: 2026-10-20\nsources: mozi-sales\nsource_hashes:\n  mozi-sales: ' + 'a'.repeat(64) + '\n---\nBody.');
  A.ok(good.meta && good.meta.title === 'T' && good.meta.source_hashes['mozi-sales'] === 'a'.repeat(64), 'parsePage reads the frontmatter subset');
  A.ok(W.parsePage('x', 'no frontmatter').error, 'parsePage refuses a page without frontmatter');
  A.ok(W.parsePage('x', '---\ntitle: T\n---\nBody.').error, 'parsePage refuses incomplete frontmatter');

  // ---- lint: the real repo wiki is clean ----
  const real = W.lint(ROOT);
  A.eq(real.errors, [], 'the repo wiki lints with zero errors');
  for (const w of real.warnings) console.log('  warn: ' + w);

  // ---- lint: a broken fixture reports every class of problem ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-fixture-'));
  write(tmp, 'knowledge/sources.json', JSON.stringify({ sources: [{ id: 'mozi-sales', routes: [] }] }));
  write(tmp, 'knowledge/MANIFEST.json', JSON.stringify({ sources: { 'mozi-sales': { content_sha256: 'b'.repeat(64) } } }));
  write(tmp, 'knowledge/wiki/index.md', '# i\n- [[alpha]]\n- [[ghost]]\n');
  write(tmp, 'knowledge/wiki/log.md', '# log\n## 2026-10-20 no pipe entry\n');
  write(tmp, 'knowledge/wiki/contradictions.md', '# register\n');
  write(tmp, 'knowledge/wiki/pages/alpha.md',
    '---\ntitle: A\nupdated: 2026-10-20\nsources: mozi-sales\nsource_hashes:\n  mozi-sales: ' + 'a'.repeat(64) + '\n---\nClaims. CONTRADICTION[C-001]: x vs y.');
  write(tmp, 'knowledge/wiki/pages/beta.md', 'no frontmatter at all');
  write(tmp, 'knowledge/wiki/pages/gamma.md', // in index? no -> unlisted; orphan too
    '---\ntitle: G\nupdated: 2026-10-20\nsources: wiki\nsource_hashes:\n---\nAlone.');
  const r = W.lint(tmp);
  const joined = r.errors.join('\n');
  A.ok(joined.includes('missing page: ghost'), 'index entry with no page is an error');
  A.ok(joined.includes('page not listed in index.md: gamma'), 'a parseable page missing from the index is an error');
  A.ok(!joined.includes('page not listed in index.md: beta'), 'a page with a frontmatter error is reported by that error, not double-counted');
  A.ok(joined.includes('beta: missing frontmatter block'), 'broken frontmatter is an error');
  A.ok(joined.includes('C-001 not registered'), 'an unregistered contradiction marker is an error');
  A.ok(joined.includes('malformed entry'), 'a malformed log line is an error');
  A.ok(r.warnings.some(w => w.includes('alpha: stale')), 'a source hash mismatch warns stale');
  A.ok(r.warnings.some(w => w.includes('gamma: orphan')), 'an unlinked page warns orphan');

  // ---- review fixes: duplicates, artifact staleness, district routing, load failures ----
  write(tmp, 'knowledge/wiki/index.md', '# i\n- [[alpha]]\n- [[alpha]]\n');
  A.ok(W.lint(tmp).errors.join('\n').includes('lists a page more than once: alpha'), 'a duplicate index entry is an error');
  const gfile = path.join(tmp, 'g.json'); fs.writeFileSync(gfile, '{"a":1}');
  const srcDef = { id: 'mozi-sales', graph: 'g.json', routes: [] };
  const h1 = W.artifactHash(tmp, srcDef); fs.writeFileSync(gfile, '{"a":2}');
  A.ok(h1 && h1 !== W.artifactHash(tmp, srcDef), 'artifactHash changes when the graph file changes');
  write(tmp, 'knowledge/sources.json', JSON.stringify({ sources: [srcDef] }));
  write(tmp, 'knowledge/wiki/index.md', '# i\n- [[alpha]]\n');
  write(tmp, 'knowledge/wiki/pages/alpha.md', '---\ntitle: A\nupdated: 2026-10-20\nsources: mozi-sales\nsource_hashes:\n  mozi-sales: ' + 'b'.repeat(64) + '\nartifact_hashes:\n  mozi-sales: ' + h1 + '\n---\nClaims.');
  A.ok(W.lint(tmp).warnings.some(w => w.includes('alpha: stale - graph/canon')), 'a changed graph with unchanged transcripts warns stale');
  write(tmp, 'knowledge/wiki/pages/alpha.md', '---\ntitle: A\nupdated: 2026-10-20\nsources: mozi-sales\nsource_hashes:\n  mozi-sales: ' + 'b'.repeat(64) + '\nartifact_hashes:\n  mozi-sales: ' + W.artifactHash(tmp, srcDef) + '\n---\nClaims.');
  A.ok(!W.lint(tmp).warnings.some(w => w.includes('alpha: stale')), 'a matching artifact hash is not stale');
  const unreadable = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-empty-'));
  A.eq(W.loadPages(unreadable), [], 'a missing wiki dir loads as no pages');
  const dd = makeKnowledgeDesk({ root: ROOT });
  const imp = await dd.search({ q: 'hormozi doctrine', district: 'impact', limit: 5 });
  A.ok(imp.body.results.every(x => x.external_id !== 'mozi-sales-doctrine'), 'a district query does not return a wiki page compiled only from sources not routed to it');
  const rev = await dd.search({ q: 'hormozi doctrine', district: 'revenue', limit: 5 });
  A.ok(rev.body.results.some(x => x.external_id === 'mozi-sales-doctrine'), 'a routed district still gets the wiki page');

  // ---- gateway: wiki pages fold into both backends, labelled and first ----
  const desk = makeKnowledgeDesk({ root: ROOT });
  const hit = await desk.search({ q: 'hormozi doctrine', limit: 5 });
  A.ok(hit.code === 200 && hit.body.results.length > 0 && hit.body.results[0].kind === 'wiki' && hit.body.results[0].source_id === 'city-wiki',
    'file backend returns the wiki page first, labelled kind wiki');
  A.ok(hit.body.results.every(x => x.kind === 'wiki' || x.source_id !== 'city-wiki'), 'raw passages keep their own source ids');

  const stub = async () => ({ ok: true, text: async () => JSON.stringify([{ source_id: 'mozi-sales', external_id: 'v1', title: 'Raw', url: null, snippet: 'raw passage', rank: 0.5 }]) });
  const db = makeKnowledgeDesk({ supabaseUrl: 'http://x', supabaseKey: 'k', fetchImpl: stub, root: ROOT });
  const merged = await db.search({ q: 'hormozi doctrine', limit: 10 });
  A.ok(merged.body.backend === 'supabase' && merged.body.results.length === 3, 'supabase backend merges wiki + db rows (both seed pages match)');
  A.ok(merged.body.results[0].kind === 'wiki' && merged.body.results[2].source_id === 'mozi-sales', 'wiki ranks ahead of raw in the merge');

  const noWiki = await db.search({ q: 'zzqqxx', limit: 5 });
  A.ok(noWiki.body.results.length === 1 && !noWiki.body.results[0].kind, 'a query with no wiki hit returns db rows untouched');

  A.report();
})().catch(e => { console.error(e); process.exit(1); });
