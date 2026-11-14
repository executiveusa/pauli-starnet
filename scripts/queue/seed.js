#!/usr/bin/env node
'use strict';
// Seed district queues from a JSON file: create missing labels and issues, skip anything that exists (same title,
// open or closed). Issues are created WITHOUT the 'approved' label, so nothing runs until a person approves it.
//   node scripts/queue/seed.js program/city-247/04_first_lanes/seed-issues.json [--dry-run]
// Env: GITHUB_TOKEN (issues: write on the queue repo).
const fs = require('fs');

function makeSeeder({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'starnet-queue-seed', 'Content-Type': 'application/json' };
  if (env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + env.GITHUB_TOKEN;
  async function gh(path, init = {}) {
    const res = await fetchImpl('https://api.github.com' + path, { ...init, headers });
    const text = await res.text();
    if (!res.ok) throw new Error((init.method || 'GET') + ' ' + path + ' -> ' + res.status + ': ' + text.slice(0, 160));
    return text ? JSON.parse(text) : null;
  }
  async function pages(path) {
    const out = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await gh(path + (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
      out.push(...batch);
      if (batch.length < 100) break;
    }
    return out;
  }

  async function seed(spec, { dryRun = false } = {}) {
    const repo = spec.repo;
    const report = { repo, labels_created: [], issues_created: [], skipped: [] };
    const meta = await gh('/repos/' + repo);
    if (meta && meta.has_issues === false) throw new Error('Issues are disabled on ' + repo + ': enable them (Settings > General > Features > Issues), then run the seed again');
    const haveLabels = new Set((await pages('/repos/' + repo + '/labels')).map(l => l.name));
    for (const l of spec.labels) {
      if (haveLabels.has(l.name)) continue;
      if (!dryRun) await gh('/repos/' + repo + '/labels', { method: 'POST', body: JSON.stringify(l) });
      report.labels_created.push(l.name);
    }
    const haveTitles = new Set((await pages('/repos/' + repo + '/issues?state=all')).map(i => i.title));
    for (const it of spec.issues) {
      if (it.labels.includes('approved')) throw new Error('seed issues must not be pre-approved: ' + it.title);
      if (haveTitles.has(it.title)) { report.skipped.push(it.title); continue; }
      let number = null;
      if (!dryRun) number = (await gh('/repos/' + repo + '/issues', { method: 'POST', body: JSON.stringify({ title: it.title, body: it.body, labels: it.labels }) })).number;
      report.issues_created.push({ number, title: it.title });
    }
    return report;
  }
  return { seed };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: seed.js <spec.json> [--dry-run]'); process.exit(64); }
  makeSeeder().seed(JSON.parse(fs.readFileSync(file, 'utf8')), { dryRun: process.argv.includes('--dry-run') })
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { makeSeeder };
