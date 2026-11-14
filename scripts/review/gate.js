#!/usr/bin/env node
'use strict';
// Post the review gate's SHIP/HOLD as a commit status on the PR's exact head commit (scripts/review/gate-lib.js).
//   node scripts/review/gate.js --repo executiveusa/pauli-starnet --pr 63
// Env: GITHUB_TOKEN (statuses: write, pull-requests: read, checks: read), REVIEW_GATE_REVIEWERS (comma-separated
// GitHub logins allowed to say SHIP), REVIEW_GATE_REQUIRED_CHECKS (optional comma-separated check names),
// REVIEW_GATE_DRY_RUN=1 to print without posting. Prints the verdict as one JSON line (the receipt).
const { verdict, statusFor } = require('./gate-lib.js');

const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);

function makeGate({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'starnet-review-gate', 'X-GitHub-Api-Version': '2022-11-28' };
  if (env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + env.GITHUB_TOKEN;
  async function gh(path, init = {}) {
    const res = await fetchImpl('https://api.github.com' + path, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    const text = await res.text();
    if (!res.ok) throw new Error((init.method || 'GET') + ' ' + path + ' -> ' + res.status + ': ' + text.slice(0, 160));
    return text ? JSON.parse(text) : null;
  }
  async function all(path) {
    const out = [];
    for (let page = 1; page <= 10; page++) {
      const sep = path.includes('?') ? '&' : '?';
      const batch = await gh(path + sep + 'per_page=100&page=' + page);
      const rows = Array.isArray(batch) ? batch : (batch.check_runs || []);
      out.push(...rows);
      if (rows.length < 100) break;
    }
    return out;
  }

  async function run({ repo, pr: number }) {
    const pr = await gh('/repos/' + repo + '/pulls/' + number);
    const headSha = pr.head.sha;
    const [commits, reviews, checks] = await Promise.all([
      all('/repos/' + repo + '/pulls/' + number + '/commits'),
      all('/repos/' + repo + '/pulls/' + number + '/reviews'),
      all('/repos/' + repo + '/commits/' + headSha + '/check-runs')
    ]);
    const v = verdict({ pr, headSha, commits, reviews, checks, reviewers: list(env.REVIEW_GATE_REVIEWERS), requiredChecks: list(env.REVIEW_GATE_REQUIRED_CHECKS) });
    v.repo = repo;
    if (env.REVIEW_GATE_DRY_RUN !== '1') {
      await gh('/repos/' + repo + '/statuses/' + headSha, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(statusFor(v)) });
      v.posted = true;
    }
    return v;
  }
  return { run };
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const get = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const repo = get('--repo'), pr = parseInt(get('--pr'), 10);
  if (!repo || !pr) { console.error('usage: gate.js --repo owner/name --pr N'); process.exit(64); }
  makeGate().run({ repo, pr })
    .then(v => { console.log(JSON.stringify(v)); })
    .catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
}

module.exports = { makeGate };
