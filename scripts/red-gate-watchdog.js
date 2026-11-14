#!/usr/bin/env node
/* Red-gate watchdog: watches the watchers.
   For every fleet repository in ops/red-gate-watchdog.json it reads the GitHub Actions runs on the
   repository's main branch. A workflow whose latest completed runs have been failing for more than
   24 hours, or whose latest run has been queued/running for more than 24 hours (for example a
   self-hosted runner that is down), is a red gate. A repository the token cannot read is reported as
   unknown: being unable to see a gate is not the same as the gate being green.

   One issue in this repository carries the current list. It is opened or updated while anything is
   red or unknown, gets a comment when a new red gate appears, and is closed when everything is green.

     node scripts/red-gate-watchdog.js [--dry-run]

   Env: FLEET_READ_TOKEN (Actions + metadata read on the fleet; falls back to GITHUB_TOKEN, which only
   sees public repositories), GITHUB_TOKEN + GITHUB_REPOSITORY (to manage the issue here),
   RED_GATE_HOURS (default 24). */
'use strict';
const fs = require('fs');
const path = require('path');

const API = 'https://api.github.com';
const MARKER = '<!-- red-gate-watchdog -->';
const TITLE = 'Red gates: fleet main branches red for more than 24h';
const RED = new Set(['failure', 'timed_out', 'startup_failure']);

/* runs: one workflow's runs on the watched branch, any order. Returns null when it is fine. */
function assessWorkflow(runs, nowMs, thresholdMs) {
  const sorted = runs.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const latest = sorted[0];
  if (!latest) return null;
  if (latest.status !== 'completed' && nowMs - Date.parse(latest.created_at) > thresholdMs) {
    return { state: 'stuck', since: latest.created_at, url: latest.html_url, detail: `run ${latest.status}` };
  }
  // Newest decided run (completed, not cancelled) must be red; the streak starts at the oldest red
  // run before the last green one.
  const decided = sorted.filter(r => r.status === 'completed' && r.conclusion !== 'cancelled');
  if (!decided.length || !RED.has(decided[0].conclusion)) return null;
  let firstRed = decided[0];
  for (const run of decided) {
    if (!RED.has(run.conclusion)) break;
    firstRed = run;
  }
  if (nowMs - Date.parse(firstRed.created_at) <= thresholdMs) return null;
  return { state: 'red', since: firstRed.created_at, url: decided[0].html_url, detail: decided[0].conclusion };
}

function ageHours(since, nowMs) {
  return Math.floor((nowMs - Date.parse(since)) / 3600000);
}

const findingKey = f => `${f.repo}|${f.workflow || ''}|${f.state}`;
const KEYS = /<!-- red-gate-keys (\[.*?\]) -->/;

function renderReport(findings, nowMs) {
  const bad0 = findings.filter(f => f.state !== 'green');
  const lines = [MARKER, `<!-- red-gate-keys ${JSON.stringify(bad0.map(findingKey))} -->`, `Checked ${new Date(nowMs).toISOString()} by \`scripts/red-gate-watchdog.js\`.`, ''];
  const bad = findings.filter(f => f.state !== 'green');
  if (!bad.length) return lines.concat('All watched gates are green or recovered within the threshold.').join('\n');
  lines.push('| Repository | Branch | Gate | State | For | Latest run |', '|---|---|---|---|---|---|');
  for (const f of bad) {
    const age = f.since ? `${ageHours(f.since, nowMs)}h` : '';
    const link = f.url ? `[run](${f.url})` : '';
    lines.push(`| ${f.repo} | ${f.branch || ''} | ${f.workflow || ''} | ${f.state}${f.detail ? ` (${f.detail})` : ''} | ${age} | ${link} |`);
  }
  lines.push('', 'Red: the newest completed run failed and the failures started more than the threshold ago.',
    'Stuck: the newest run has been queued or running longer than the threshold (often a runner that is down).',
    'Unknown: the watchdog could not read the repository; fix the token rather than assuming it is green.');
  return lines.join('\n');
}

/* What to do with the tracking issue, given the findings and the currently open issue (or null). */
function planIssueAction(findings, openIssue) {
  const bad = findings.filter(f => f.state !== 'green');
  if (!bad.length) return openIssue ? { action: 'close' } : { action: 'none' };
  if (!openIssue) return { action: 'create' };
  const match = KEYS.exec(openIssue.body || '');
  let known = [];
  try { known = match ? JSON.parse(match[1]) : []; } catch (_) { known = []; }
  return { action: 'update', newRed: bad.map(findingKey).filter(k => !known.includes(k)) };
}

async function gh(token, method, url, body) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'starnet-red-gate-watchdog',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${url}: ${res.status} ${data && data.message ? data.message : ''}`.trim());
    err.status = res.status;
    throw err;
  }
  return data;
}

async function checkRepo(token, entry, nowMs, thresholdMs) {
  const repo = entry.repo;
  let branch = entry.branch;
  try {
    if (!branch) branch = (await gh(token, 'GET', `/repos/${repo}`)).default_branch;
    await gh(token, 'GET', `/repos/${repo}/branches/${encodeURIComponent(branch)}`); // a missing branch is unknown, not green
    const workflows = (await gh(token, 'GET', `/repos/${repo}/actions/workflows?per_page=100`)).workflows
      .filter(w => w.state === 'active');
    const findings = [];
    for (const wf of workflows) {
      const runs = (await gh(token, 'GET',
        `/repos/${repo}/actions/workflows/${wf.id}/runs?branch=${encodeURIComponent(branch)}&per_page=30`)).workflow_runs;
      const verdict = assessWorkflow(runs, nowMs, thresholdMs);
      findings.push(verdict ? { repo, branch, workflow: wf.name, ...verdict } : { repo, branch, workflow: wf.name, state: 'green' });
    }
    return findings;
  } catch (error) {
    return [{ repo, branch, state: 'unknown', detail: error.message }];
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const nowMs = Date.now();
  const thresholdMs = Number(process.env.RED_GATE_HOURS || 24) * 3600000;
  const readToken = process.env.FLEET_READ_TOKEN || process.env.GITHUB_TOKEN || '';
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ops', 'red-gate-watchdog.json'), 'utf8'));

  const findings = [];
  for (const entry of config.repositories) findings.push(...await checkRepo(readToken, entry, nowMs, thresholdMs));
  const report = renderReport(findings, nowMs);
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
  if (dryRun) return;

  const here = process.env.GITHUB_REPOSITORY;
  const issueToken = process.env.GITHUB_TOKEN;
  if (!here || !issueToken) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required to manage the issue (or use --dry-run).');
  const open = (await gh(issueToken, 'GET', `/repos/${here}/issues?state=open&per_page=100`))
    .find(i => !i.pull_request && (i.body || '').includes(MARKER)) || null;
  const plan = planIssueAction(findings, open);
  if (plan.action === 'create') {
    await gh(issueToken, 'POST', `/repos/${here}/issues`, { title: TITLE, body: report });
  } else if (plan.action === 'update') {
    await gh(issueToken, 'PATCH', `/repos/${here}/issues/${open.number}`, { body: report });
    if (plan.newRed.length) {
      await gh(issueToken, 'POST', `/repos/${here}/issues/${open.number}/comments`,
        { body: `New red gates:\n\n${plan.newRed.map(k => `- ${k.split('|').join(' / ')}`).join('\n')}` });
    }
  } else if (plan.action === 'close') {
    await gh(issueToken, 'POST', `/repos/${here}/issues/${open.number}/comments`, { body: 'All watched gates are green again. Closing.' });
    await gh(issueToken, 'PATCH', `/repos/${here}/issues/${open.number}`, { state: 'closed', state_reason: 'completed' });
  }
  console.log(`issue: ${plan.action}`);
}

module.exports = { assessWorkflow, renderReport, planIssueAction };

if (require.main === module) {
  main().catch(error => { console.error(`red-gate watchdog: ${error.message}`); process.exit(1); });
}
