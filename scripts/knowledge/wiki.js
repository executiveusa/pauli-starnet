'use strict';
// The city wiki: loader + lint (knowledge/wiki/SCHEMA.md). The gateway uses loadPages() to fold wiki
// pages into /v1/knowledge/search; the fast gate uses lint() to keep the compiled layer honest.
// No dependencies beyond fs/path so the gateway and tests stay light.
const fs = require('fs');
const path = require('path');

const CONTRA_RE = /CONTRADICTION\[(C-\d+)\]/g;
const LINK_RE = /\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]/g;
const LOG_RE = /^## \[\d{4}-\d{2}-\d{2}\] (ingest|query-filed|lint|update) \| .+/;

// Parse the frontmatter subset SCHEMA.md defines. Returns { meta, body } or { error }.
function parsePage(name, raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { error: name + ': missing frontmatter block' };
  const meta = { source_hashes: {} };
  let inHashes = false;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    const sub = line.match(/^\s{2}([a-z0-9-]+):\s*([0-9a-f]{64})\s*$/);
    if (sub && inHashes) { meta.source_hashes[sub[1]] = sub[2]; continue; }
    inHashes = false;
    if (!kv) { if (line.trim()) return { error: name + ': bad frontmatter line: ' + line.trim() }; continue; }
    if (kv[1] === 'title') meta.title = kv[2].trim();
    else if (kv[1] === 'updated') meta.updated = kv[2].trim();
    else if (kv[1] === 'sources') meta.sources = kv[2].split(',').map(s => s.trim()).filter(Boolean);
    else if (kv[1] === 'source_hashes') inHashes = true;
    else return { error: name + ': unknown frontmatter key: ' + kv[1] };
  }
  if (!meta.title) return { error: name + ': frontmatter needs title' };
  if (!meta.updated || !/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) return { error: name + ': frontmatter needs updated: YYYY-MM-DD' };
  if (!meta.sources || !meta.sources.length) return { error: name + ': frontmatter needs sources' };
  return { meta, body: m[2] };
}

// Read every page in knowledge/wiki/pages/. Missing wiki dir is fine (older deploys): returns [].
function loadPages(root) {
  const dir = path.join(root, 'knowledge', 'wiki', 'pages');
  if (!fs.existsSync(dir)) return [];
  const pages = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
    const slug = f.replace(/\.md$/, '');
    const parsed = parsePage(slug, fs.readFileSync(path.join(dir, f), 'utf8'));
    pages.push({ slug, ...parsed });
  }
  return pages;
}

function readIf(root, rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// Health-check the wiki. Returns { errors, warnings } - errors fail the gate, warnings ask for a recompile.
function lint(root) {
  const errors = [], warnings = [];
  const pages = loadPages(root);
  const bySlug = new Map(pages.map(p => [p.slug, p]));
  for (const p of pages) if (p.error) errors.push(p.error);

  const manifest = JSON.parse(readIf(root, 'knowledge/MANIFEST.json') || '{"sources":{}}').sources || {};
  const registry = JSON.parse(readIf(root, 'knowledge/sources.json') || '{"sources":[]}').sources || [];
  const knownSources = new Set(registry.map(s => s.id));

  // index.md: every page listed exactly once, no dead entries.
  const indexRaw = readIf(root, 'knowledge/wiki/index.md') || '';
  const indexed = new Set();
  for (const m of indexRaw.matchAll(LINK_RE)) {
    if (m[1].includes('/') || m[0].startsWith('[[../')) continue;   // register links, not pages
    indexed.add(m[1]);
    if (!bySlug.has(m[1])) errors.push('index.md lists missing page: ' + m[1]);
  }
  for (const p of pages) {
    if (!p.error && !indexed.has(p.slug)) errors.push('page not listed in index.md: ' + p.slug);
  }

  // Per-page: known sources, staleness vs MANIFEST.json, contradiction registration, orphan check.
  const contraRaw = readIf(root, 'knowledge/wiki/contradictions.md') || '';
  const inbound = new Map();
  for (const p of pages) {
    if (p.error) continue;
    for (const m of p.body.matchAll(LINK_RE)) if (bySlug.has(m[1])) inbound.set(m[1], (inbound.get(m[1]) || 0) + 1);
  }
  for (const p of pages) {
    if (p.error) continue;
    for (const s of p.meta.sources) {
      if (s === 'wiki') continue;
      if (!knownSources.has(s)) errors.push(p.slug + ': unknown source id in frontmatter: ' + s);
      const cur = manifest[s] && manifest[s].content_sha256;
      if (cur && p.meta.source_hashes[s] && cur !== p.meta.source_hashes[s]) {
        warnings.push(p.slug + ': stale - source "' + s + '" changed after this page was compiled');
      }
      if (cur && !p.meta.source_hashes[s]) warnings.push(p.slug + ': no recorded hash for source "' + s + '" - staleness cannot be checked');
    }
    for (const m of p.body.matchAll(CONTRA_RE)) {
      if (!contraRaw.includes(m[1])) errors.push(p.slug + ': ' + m[1] + ' not registered in contradictions.md');
    }
    if (p.slug !== 'overview' && !inbound.get(p.slug)) warnings.push(p.slug + ': orphan - no other page links to it');
  }
  const openContra = (contraRaw.match(/\| open \|/g) || []).length;
  if (openContra) warnings.push(openContra + ' open contradiction(s) in contradictions.md');

  // log.md: append-only with parseable prefixes.
  const logRaw = readIf(root, 'knowledge/wiki/log.md');
  if (!logRaw) errors.push('knowledge/wiki/log.md is missing');
  else for (const line of logRaw.split(/\r?\n/)) {
    if (line.startsWith('## ') && !LOG_RE.test(line)) errors.push('log.md: malformed entry: ' + line.slice(0, 60));
  }
  return { errors, warnings };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const { errors, warnings } = lint(root);
  for (const w of warnings) console.log('warn: ' + w);
  for (const e of errors) console.log('error: ' + e);
  console.log('wiki lint: ' + errors.length + ' error(s), ' + warnings.length + ' warning(s)');
  process.exit(errors.length ? 1 : 0);
}

module.exports = { parsePage, loadPages, lint };
