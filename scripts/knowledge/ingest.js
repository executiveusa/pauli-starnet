#!/usr/bin/env node
'use strict';
// Build the SQL that loads the city knowledge base (knowledge/CONTEXT.md).
//
//   node scripts/knowledge/ingest.js --out build/knowledge.sql            # every indexed source in this repo
//   node scripts/knowledge/ingest.js --dir jasper-smart-sites=/root/jasper-highlevel-transcripts/selected50 \
//        --only jasper-smart-sites --out jasper.sql                        # an on_server source, run on that box
//   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f build/knowledge.sql
//
// The output is one transaction, safe to re-run: sources and routes are upserted, each document's chunks are
// replaced, and imported insights never overwrite one a reviewer has already marked reviewed.
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const ROOT = path.resolve(__dirname, '..', '..');

function args(argv) {
  const o = { out: null, only: null, dirs: {}, manifest: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--only') o.only = argv[++i];
    else if (a === '--manifest') o.manifest = argv[++i];
    else if (a === '--dir') { const [id, ...rest] = argv[++i].split('='); o.dirs[id] = rest.join('='); }
    else throw new Error('unknown argument: ' + a);
  }
  return o;
}

function loadTitles(file) {
  const titles = new Map();
  if (!file || !fs.existsSync(file)) return titles;
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(d) ? d : (d.videos || []);
  for (const v of list) {
    const id = v.video_id || v.id;
    if (id && v.title) titles.set(id, v.title);
  }
  return titles;
}

function evidenceOf(node) {
  const e = node.evidence_verbatim;
  const list = Array.isArray(e) ? e : (e && Array.isArray(e.verbatim) ? e.verbatim : []);
  return list.filter(x => x && x.quote).map(x => ({ video_id: x.video_id || null, quote: String(x.quote) }));
}

function readSource(src, dirOverride) {
  const dir = dirOverride || (src.status === 'indexed' ? path.join(ROOT, src.location) : null);
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  const titles = loadTitles(src.title_index && path.join(ROOT, src.title_index));
  const docs = [];
  for (const name of L.pickFiles(fs.readdirSync(dir))) {
    const p = L.parseTranscript(name, fs.readFileSync(path.join(dir, name), 'utf8'));
    if (p.text.length < 200) continue;               // caption stubs with no usable text
    const id = p.external_id || name;
    docs.push({ external_id: id, title: titles.get(id) || p.title, url: p.url, text: p.text, sha256: L.sha256(p.text) });
  }
  return docs;
}

function build(registry, opts) {
  const sql = ['BEGIN;'];
  const manifest = { generated_from: 'knowledge/sources.json', sources: {} };
  const sources = registry.sources.filter(s => !opts.only || s.id === opts.only);
  if (opts.only && !sources.length) throw new Error('no source with id ' + opts.only);

  for (const s of sources) {
    const status = opts.dirs[s.id] ? 'indexed' : s.status;
    sql.push(`INSERT INTO kb_sources (id, title, creator, status, location, updated_at) VALUES (${L.sqlStr(s.id)}, ${L.sqlStr(s.title)}, ${L.sqlStr(s.creator)}, ${L.sqlStr(status)}, ${L.sqlStr(opts.dirs[s.id] || s.location)}, now())
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, creator = EXCLUDED.creator, status = EXCLUDED.status, location = EXCLUDED.location, updated_at = now();`);
    sql.push(`DELETE FROM kb_routes WHERE source_id = ${L.sqlStr(s.id)};`);
    for (const r of s.routes) {
      sql.push(`INSERT INTO kb_routes (source_id, district, use_for) VALUES (${L.sqlStr(s.id)}, ${L.sqlStr(r.district)}, ${L.sqlStr(r.use_for)});`);
    }

    const entry = { status, documents: 0, chunks: 0, chars: 0, insights: 0 };
    const docs = readSource(s, opts.dirs[s.id]);
    for (const d of docs || []) {
      const key = `source_id = ${L.sqlStr(s.id)} AND external_id = ${L.sqlStr(d.external_id)}`;
      sql.push(`INSERT INTO kb_documents (source_id, external_id, title, url, sha256, char_count) VALUES (${L.sqlStr(s.id)}, ${L.sqlStr(d.external_id)}, ${L.sqlStr(d.title)}, ${L.sqlStr(d.url)}, ${L.sqlStr(d.sha256)}, ${d.text.length})
  ON CONFLICT (source_id, external_id) DO UPDATE SET title = EXCLUDED.title, url = EXCLUDED.url, sha256 = EXCLUDED.sha256, char_count = EXCLUDED.char_count, ingested_at = now();`);
      sql.push(`DELETE FROM kb_chunks WHERE document_id = (SELECT id FROM kb_documents WHERE ${key});`);
      const chunks = L.chunkText(d.text);
      const rows = chunks.map((c, i) => `(${i}, ${L.sqlStr(c)})`).join(',\n  ');
      sql.push(`INSERT INTO kb_chunks (document_id, ord, body) SELECT (SELECT id FROM kb_documents WHERE ${key}), v.ord, v.body FROM (VALUES\n  ${rows}) AS v(ord, body);`);
      entry.documents++; entry.chunks += chunks.length; entry.chars += d.text.length;
    }
    if (docs) entry.content_sha256 = L.sha256(docs.map(d => d.external_id + ':' + d.sha256).sort().join('\n'));

    if (s.graph) {
      const g = JSON.parse(fs.readFileSync(path.join(ROOT, s.graph), 'utf8'));
      const district = s.routes[0].district;
      for (const n of g.nodes || []) {
        const body = n.summary_interpretation || n.summary || '';
        if (!n.id || !n.name || !body) continue;
        sql.push(`INSERT INTO kb_insights (id, source_id, district, kind, title, body, evidence, created_by) VALUES (${L.sqlStr(s.id + ':' + n.id)}, ${L.sqlStr(s.id)}, ${L.sqlStr(district)}, ${L.sqlStr(n.type || 'rule')}, ${L.sqlStr(n.name)}, ${L.sqlStr(body)}, ${L.sqlJson(evidenceOf(n))}, ${L.sqlStr('import:' + s.graph)})
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, evidence = EXCLUDED.evidence, kind = EXCLUDED.kind, updated_at = now() WHERE kb_insights.status = 'draft';`);
        entry.insights++;
      }
    }
    if (s.canon) {
      // A distilled canon file (e.g. Middleton system.json): one insight per top-level section, cited.
      const canon = JSON.parse(fs.readFileSync(path.join(ROOT, s.canon), 'utf8'));
      const district = s.routes[0].district;
      for (const [k, v] of Object.entries(canon)) {
        if (k === 'meta' || k === 'coverage' || v == null) continue;
        const body = typeof v === 'string' ? v : JSON.stringify(v, null, 1);
        const ids = [...new Set((body.match(/\b[A-Za-z0-9_-]{11}\b/g) || []).filter(x => /[0-9]/.test(x) && /[A-Za-z]/.test(x)))];
        sql.push(`INSERT INTO kb_insights (id, source_id, district, kind, title, body, evidence, created_by) VALUES (${L.sqlStr(s.id + ':' + k)}, ${L.sqlStr(s.id)}, ${L.sqlStr(district)}, 'playbook', ${L.sqlStr(k.replace(/_/g, ' '))}, ${L.sqlStr(body)}, ${L.sqlJson(ids.map(video_id => ({ video_id, quote: null })))}, ${L.sqlStr('import:' + s.canon)})
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, evidence = EXCLUDED.evidence, updated_at = now() WHERE kb_insights.status = 'draft';`);
        entry.insights++;
      }
    }
    manifest.sources[s.id] = entry;
  }
  sql.push('COMMIT;');
  return { sql: sql.join('\n') + '\n', manifest };
}

if (require.main === module) {
  const opts = args(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'sources.json'), 'utf8'));
  const { sql, manifest } = build(registry, opts);
  if (opts.out) { fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true }); fs.writeFileSync(opts.out, sql); }
  else process.stdout.write(sql);
  if (opts.manifest) fs.writeFileSync(opts.manifest, JSON.stringify(manifest, null, 2) + '\n');
  process.stderr.write(JSON.stringify(manifest.sources) + '\n');
}

module.exports = { build, readSource, evidenceOf };
