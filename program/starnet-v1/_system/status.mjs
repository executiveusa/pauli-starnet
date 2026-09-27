#!/usr/bin/env node
// Derives each stage's status from NN_*/output/EVIDENCE.md. Status is never hand-typed (CONTEXT.md, "The status rule").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseEvidence(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text || '');
  if (!m) return null;
  const out = { proof: [] };
  let inProof = false;
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (/^proof:\s*$/.test(line)) { inProof = true; continue; }
    const item = /^\s+-\s+(.+)$/.exec(line);
    if (inProof && item) { out.proof.push(item[1].trim()); continue; }
    inProof = false;
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

export function stageStatus(ev) {
  if (!ev) return { status: 'open' };
  if (ev.status === 'blocked') return { status: 'blocked', note: ev.blocker || 'no blocker named' };
  if (ev.status !== 'done') return { status: 'open' };
  if (!ev.proof.length) return { status: 'claimed', note: 'no proof' };
  if (!ev.verified_by || !ev.built_by || ev.verified_by === ev.built_by) return { status: 'claimed', note: 'not independently verified' };
  return { status: 'done', note: `verified by ${ev.verified_by}` };
}

export function programStatus(root) {
  return fs.readdirSync(root).filter(d => /^\d\d_/.test(d)).sort().map(stage => {
    const file = path.join(root, stage, 'output', 'EVIDENCE.md');
    const ev = fs.existsSync(file) ? parseEvidence(fs.readFileSync(file, 'utf8')) : null;
    return { stage, ...stageStatus(ev) };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = programStatus(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  for (const r of rows) console.log(`${r.stage.padEnd(20)} ${r.status.padEnd(8)} ${r.note || ''}`);
  console.log(`\n${rows.filter(r => r.status === 'done').length}/${rows.length} stages done`);
}
