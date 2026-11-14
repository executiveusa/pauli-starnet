/* review-gate.test.js — SHIP/HOLD bound to the exact head commit (program/city-247/03_review_gate).
   Run: node test/review-gate.test.js */
'use strict';
const A = require('./_assert.js');
const { verdict, statusFor } = require('../scripts/review/gate-lib.js');
const { makeGate } = require('../scripts/review/gate.js');

const HEAD = 'a'.repeat(40), OLD = 'b'.repeat(40);
const pr = { number: 63, user: { login: 'claude-builder' } };
const commits = [{ author: { login: 'claude-builder' } }];
const green = [{ name: 'gitleaks', status: 'completed', conclusion: 'success' }, { name: 'review', status: 'completed', conclusion: 'skipped' }];
const review = (login, state, sha, at = '2026-10-15T10:00:00Z', id = 1) => ({ id, user: { login }, state, commit_id: sha, submitted_at: at });
const V = over => verdict(Object.assign({ pr, headSha: HEAD, commits, reviews: [], checks: green, reviewers: ['bambu', 'auditor-bot'] }, over));

(async () => {
  const ship = V({ reviews: [review('auditor-bot', 'APPROVED', HEAD)] });
  A.ok(ship.verdict === 'SHIP' && ship.reviewer === 'auditor-bot' && ship.head_sha === HEAD, 'an independent approval on the head commit with green checks is SHIP');
  A.eq(statusFor(ship), { state: 'success', context: 'starnet/review-gate', description: 'SHIP: approved by auditor-bot on aaaaaaa, all checks green' }, 'SHIP posts a success status naming the reviewer and commit');

  const old = V({ reviews: [review('auditor-bot', 'APPROVED', OLD)] });
  A.ok(old.verdict === 'HOLD' && /older commit \(auditor-bot@bbbbbbb\)/.test(old.reasons[0]), 'an approval of an older commit never ships the new one');

  const self = V({ reviewers: ['claude-builder', 'bambu'], reviews: [review('claude-builder', 'APPROVED', HEAD)] });
  A.ok(self.verdict === 'HOLD' && self.reasons.some(r => /built this change/.test(r)), 'the builder cannot approve its own change, even when listed as a reviewer');

  const committer = verdict({ pr, headSha: HEAD, commits: commits.concat([{ author: { login: 'bambu' } }]), reviews: [review('bambu', 'APPROVED', HEAD)], checks: green, reviewers: ['bambu'] });
  A.eq(committer.verdict, 'HOLD', 'someone who pushed commits to the change is a builder too');

  A.eq(V({ reviews: [review('random-person', 'APPROVED', HEAD)] }).verdict, 'HOLD', 'only configured reviewers count');
  const changes = V({ reviews: [review('bambu', 'APPROVED', HEAD), review('auditor-bot', 'CHANGES_REQUESTED', HEAD, '2026-10-15T11:00:00Z', 2)] });
  A.ok(changes.verdict === 'HOLD' && changes.reasons.some(r => /changes requested by auditor-bot/.test(r)), 'a reviewer requesting changes on the head commit holds it');
  const later = V({ reviews: [review('auditor-bot', 'CHANGES_REQUESTED', HEAD, '2026-10-15T09:00:00Z', 1), review('auditor-bot', 'APPROVED', HEAD, '2026-10-15T12:00:00Z', 2)] });
  A.eq(later.verdict, 'SHIP', "a reviewer's latest review counts, not an earlier one");

  const red = V({ reviews: [review('bambu', 'APPROVED', HEAD)], checks: green.concat([{ name: 'review / OpenCodeReview', status: 'completed', conclusion: 'failure' }]) });
  A.ok(red.verdict === 'HOLD' && red.reasons.some(r => /OpenCodeReview" is failure/.test(r)), 'a failed check on the head commit holds it');
  const running = V({ reviews: [review('bambu', 'APPROVED', HEAD)], checks: green.concat([{ name: 'credential-free-evals', status: 'in_progress', conclusion: null }]) });
  A.ok(running.verdict === 'HOLD' && /has not finished/.test(running.reasons[0]), 'an unfinished check holds it');
  A.eq(V({ reviews: [review('bambu', 'APPROVED', HEAD)], checks: green.concat([{ name: 'review-gate', status: 'in_progress' }]) }).verdict, 'SHIP', 'the gate never waits on its own job');
  const missing = V({ reviews: [review('bambu', 'APPROVED', HEAD)], requiredChecks: ['review / OpenCodeReview'] });
  A.ok(missing.verdict === 'HOLD' && /did not run/.test(missing.reasons[0]), 'a required check that never ran holds it');
  const none = V({ reviewers: [] });
  A.ok(none.verdict === 'HOLD' && /no reviewer identity configured/.test(none.reasons[0]), 'without a configured reviewer nothing ships');
  A.ok(statusFor(V({ reviews: [] })).description.length <= 140, 'status descriptions fit GitHub\'s 140-character limit');

  // ---- the CLI half against a stubbed GitHub ----
  const posted = [];
  const fetchImpl = async (url, init = {}) => {
    const u = url.replace('https://api.github.com', '');
    let body;
    if (init.method === 'POST') { posted.push({ u, body: JSON.parse(init.body) }); body = {}; }
    else if (u === '/repos/o/r/pulls/63') body = { number: 63, user: { login: 'claude-builder' }, head: { sha: HEAD } };
    else if (u.startsWith('/repos/o/r/pulls/63/commits')) body = commits;
    else if (u.startsWith('/repos/o/r/pulls/63/reviews')) body = [review('bambu', 'APPROVED', HEAD)];
    else if (u.startsWith('/repos/o/r/commits/' + HEAD + '/check-runs')) body = { check_runs: green };
    else return { ok: false, status: 404, text: async () => 'not found: ' + u };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  };
  const v = await makeGate({ env: { GITHUB_TOKEN: 't', REVIEW_GATE_REVIEWERS: 'bambu' }, fetchImpl }).run({ repo: 'o/r', pr: 63 });
  A.ok(v.verdict === 'SHIP' && v.posted, 'the CLI reads the PR, reviews and checks, and posts');
  A.ok(posted.length === 1 && posted[0].u === '/repos/o/r/statuses/' + HEAD && posted[0].body.context === 'starnet/review-gate' && posted[0].body.state === 'success', 'the status is posted on the exact head commit');
  const dry = await makeGate({ env: { GITHUB_TOKEN: 't', REVIEW_GATE_REVIEWERS: 'bambu', REVIEW_GATE_DRY_RUN: '1' }, fetchImpl }).run({ repo: 'o/r', pr: 63 });
  A.ok(dry.verdict === 'SHIP' && !dry.posted && posted.length === 1, 'dry run posts nothing');

  A.report('review-gate.test');
})().catch(e => { console.error(e); process.exit(1); });
