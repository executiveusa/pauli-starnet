/* Red-gate watchdog — a gate is red only when its newest decided run failed and the failure
   streak is older than the threshold; stuck runs count; unknown repos are never reported green;
   the tracking issue is created, updated (commenting only on new red gates) and closed. */
'use strict';
const A = require('./_assert.js');
const { assessWorkflow, renderReport, planIssueAction } = require('../scripts/red-gate-watchdog.js');

const H = 3600000;
const now = Date.parse('2026-09-26T12:00:00Z');
const run = (hoursAgo, conclusion, status = 'completed') =>
  ({ created_at: new Date(now - hoursAgo * H).toISOString(), status, conclusion, html_url: `https://x/${hoursAgo}` });

A.eq(assessWorkflow([], now, 24 * H), null, 'no runs is not red');
A.eq(assessWorkflow([run(1, 'success'), run(50, 'failure')], now, 24 * H), null, 'recovered gate is green');
A.eq(assessWorkflow([run(2, 'failure'), run(30, 'success')], now, 24 * H), null, 'red for 2h is under threshold');
const red = assessWorkflow([run(2, 'failure'), run(10, 'cancelled'), run(30, 'timed_out'), run(40, 'success')], now, 24 * H);
A.eq(red && red.state, 'red', 'red streak older than 24h is red (cancelled runs ignored)');
A.eq(red && red.since, run(30).created_at, 'streak starts at the oldest red run after the last green');
A.eq(red && red.url, 'https://x/2', 'links the newest failing run');
const stuck = assessWorkflow([run(30, null, 'queued'), run(40, 'success')], now, 24 * H);
A.eq(stuck && stuck.state, 'stuck', 'a run queued for 30h is stuck (runner down)');
A.eq(assessWorkflow([run(1, null, 'in_progress'), run(2, 'success')], now, 24 * H), null, 'fresh in-progress run is fine');

const findings = [
  { repo: 'o/a', branch: 'main', workflow: 'CI', state: 'red', since: run(30).created_at, detail: 'failure', url: 'u' },
  { repo: 'o/b', branch: 'main', state: 'unknown', detail: '404' },
  { repo: 'o/c', branch: 'main', workflow: 'CI', state: 'green' },
];
const report = renderReport(findings, now);
A.ok(report.includes('| o/a | main | CI | red (failure) | 30h |'), 'report lists the red gate with its age');
A.ok(report.includes('| o/b | main |  | unknown (404)'), 'report lists unreadable repos as unknown');
A.ok(!report.includes('o/c'), 'green gates are not listed');

A.eq(planIssueAction(findings, null).action, 'create', 'opens an issue when something is red');
A.eq(planIssueAction([findings[2]], null).action, 'none', 'nothing to do when all green and no issue');
A.eq(planIssueAction([findings[2]], { body: report }).action, 'close', 'closes the issue when all green');
const same = planIssueAction(findings, { body: report });
A.eq(same, { action: 'update', newRed: [] }, 'no new-red comment when nothing changed');
const more = planIssueAction(findings.concat({ repo: 'o/d', workflow: 'Deploy', state: 'stuck' }), { body: report });
A.eq(more.newRed, ['o/d|Deploy|stuck'], 'comments only on newly red gates');

A.report();
