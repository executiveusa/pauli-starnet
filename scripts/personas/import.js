#!/usr/bin/env node
/* scripts/personas/import.js - build StarNet's model-agnostic persona library from a pinned agency-agents checkout.
   Usage: node scripts/personas/import.js <path-to-agency-agents-checkout> <expected-commit>
   Every persona is copied verbatim to personas/<department>/<file>.md, scanned with the skill guard (community trust:
   safe = allow, caution = ask, dangerous = block), hashed, and indexed in registry/personas.json. Any agent on any model
   loads a persona through the gateway (GET /v1/personas...); nothing here is tied to one harness.
   Program: program/starnet-v2/04_personas. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const guard = require('../../sidecar/skills/guard.js');

const ROOT = path.join(__dirname, '..', '..');
const FORMAT = 'starnet-persona-library/v1';
const UPSTREAM = 'https://github.com/msitarzewski/agency-agents';
const SKIP_DIRS = new Set(['integrations', 'scripts', 'examples', '.git', '.github']);
// Department -> StarNet district. Departments without a v1 district land in "intelligence" (off today, still loadable).
const DISTRICT = {
  engineering: 'production', testing: 'production', product: 'production', 'project-management': 'command',
  strategy: 'command', security: 'security', design: 'creative', marketing: 'creative', 'paid-media': 'creative',
  sales: 'revenue', support: 'revenue', finance: 'financial'
};

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return fields.name ? fields : null;
}

function slug(file) { return path.basename(file, '.md').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''); }

function build(src, commit) {
  const personas = [];
  const files = [];
  for (const dept of fs.readdirSync(src).filter(d => !SKIP_DIRS.has(d) && fs.statSync(path.join(src, d)).isDirectory()).sort()) {
    const walk = dir => fs.readdirSync(dir).sort().flatMap(n => {
      const p = path.join(dir, n);
      return fs.statSync(p).isDirectory() ? walk(p) : (n.endsWith('.md') ? [p] : []);
    });
    for (const file of walk(path.join(src, dept))) {
      const text = fs.readFileSync(file, 'utf8');
      const fm = frontmatter(text);
      if (!fm) continue;                                   // READMEs and playbooks are not personas
      const id = dept + '/' + slug(file);
      const scan = guard.scanSkillRecord({ name: id, body: text }, { source: 'community' });
      const decision = guard.shouldAllow(scan, { allowAsk: false });
      const action = scan.verdict === 'safe' ? 'allow' : (decision.action === 'block' ? 'block' : 'ask');
      personas.push({
        id, name: fm.name.slice(0, 120), description: String(fm.description || '').slice(0, 400),
        department: dept, district: DISTRICT[dept] || 'intelligence', vibe: String(fm.vibe || '').slice(0, 200),
        emoji: String(fm.emoji || '').slice(0, 8), path: 'personas/' + id + '.md',
        upstream_path: path.relative(src, file).split(path.sep).join('/'),
        sha256: crypto.createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text),
        verdict: scan.verdict, action, findings: scan.findings.map(f => f.patternId + ':' + f.severity + '@' + f.line).slice(0, 10)
      });
      files.push({ to: path.join(ROOT, 'personas', id + '.md'), text });
    }
  }
  const ids = new Set();
  for (const p of personas) { if (ids.has(p.id)) throw new Error('duplicate persona id ' + p.id); ids.add(p.id); }
  return {
    index: {
      format: FORMAT, upstream: { repo: UPSTREAM, commit, license: 'MIT' }, count: personas.length,
      counts: personas.reduce((a, p) => (a[p.action] = (a[p.action] || 0) + 1, a), {}), personas
    },
    files
  };
}

if (require.main === module) {
  const [src, expected] = process.argv.slice(2);
  if (!src || !expected) { console.error('usage: import.js <agency-agents checkout> <expected-commit>'); process.exit(2); }
  const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!head.startsWith(expected)) { console.error('checkout is at ' + head + ', expected ' + expected + ': refusing'); process.exit(1); }
  const { index, files } = build(src, head);
  fs.rmSync(path.join(ROOT, 'personas'), { recursive: true, force: true });
  for (const f of files) { fs.mkdirSync(path.dirname(f.to), { recursive: true }); fs.writeFileSync(f.to, f.text); }
  fs.copyFileSync(path.join(src, 'LICENSE'), path.join(ROOT, 'personas', 'LICENSE'));
  fs.writeFileSync(path.join(ROOT, 'personas', 'NOTICE.md'),
    '# Personas: source and license\n\nCopied verbatim from ' + UPSTREAM + ' at commit `' + head + '` (MIT, see LICENSE).\n' +
    'Rebuild only with `node scripts/personas/import.js <checkout> <commit>`; never hand-edit. Index: `registry/personas.json`.\n');
  fs.writeFileSync(path.join(ROOT, 'registry', 'personas.json'), JSON.stringify(index, null, 2) + '\n');
  console.log(JSON.stringify({ commit: head, count: index.count, counts: index.counts }));
}

module.exports = { build, frontmatter, DISTRICT, FORMAT };
