'use strict';
// The review gate's verdict, PURE (program/city-247/03_review_gate). Input: what GitHub says about one pull request
// at one head commit. Output: SHIP or HOLD for exactly that commit, with the reasons. Law:
//   - the builder runs the tests; only a separate reviewer can say SHIP
//   - a verdict binds to one commit: a review of an older commit never ships a newer one
//   - any failed or unfinished check on that commit is a HOLD
// No network, no clock: scripts/review/gate.js gathers the facts and posts the result as a commit status.

const GATE_CONTEXT = 'starnet/review-gate';
const GATE_JOB = 'review-gate';   // the gate's own Actions job: never wait on yourself

function verdict({ pr, headSha, commits = [], reviews = [], checks = [], reviewers = [], requiredChecks = [] }) {
  const reasons = [];
  const builders = new Set([pr.user && pr.user.login].concat(commits.map(c => c.author && c.author.login)).filter(Boolean).map(s => s.toLowerCase()));
  const allowed = new Set(reviewers.map(s => s.toLowerCase()));

  if (!allowed.size) reasons.push('no reviewer identity configured (set REVIEW_GATE_REVIEWERS)');

  // Latest review per reviewer, counted only when it is on this exact head commit.
  const latest = new Map();
  for (const r of reviews) {
    const who = r.user && r.user.login && r.user.login.toLowerCase();
    if (!who || !['APPROVED', 'CHANGES_REQUESTED'].includes(r.state)) continue;
    const prev = latest.get(who);
    if (!prev || String(r.submitted_at) > String(prev.submitted_at)) latest.set(who, r);
  }
  const onHead = [...latest.entries()].filter(([, r]) => r.commit_id === headSha);
  const stale = [...latest.entries()].filter(([who, r]) => r.commit_id !== headSha && allowed.has(who));
  const blocking = onHead.filter(([who, r]) => r.state === 'CHANGES_REQUESTED' && allowed.has(who));
  const approvals = onHead.filter(([who, r]) => r.state === 'APPROVED' && allowed.has(who));
  const selfApproved = approvals.filter(([who]) => builders.has(who));
  const independent = approvals.filter(([who]) => !builders.has(who));

  for (const [who] of blocking) reasons.push('changes requested by ' + who + ' on ' + headSha.slice(0, 7));
  for (const [who] of selfApproved) reasons.push(who + ' built this change, so their approval does not count');
  if (!independent.length && allowed.size) {
    reasons.push(stale.length
      ? 'approval is on an older commit (' + stale.map(([w, r]) => w + '@' + String(r.commit_id).slice(0, 7)).join(', ') + '); re-review ' + headSha.slice(0, 7)
      : 'waiting for an independent reviewer to approve ' + headSha.slice(0, 7));
  }

  const own = checks.filter(c => c.name !== GATE_CONTEXT && c.name !== GATE_JOB);
  for (const c of own) {
    if (c.status !== 'completed') reasons.push('check "' + c.name + '" has not finished');
    else if (!['success', 'neutral', 'skipped'].includes(c.conclusion)) reasons.push('check "' + c.name + '" is ' + c.conclusion);
  }
  for (const name of requiredChecks) {
    if (!own.some(c => c.name === name)) reasons.push('required check "' + name + '" did not run on ' + headSha.slice(0, 7));
  }

  const ship = reasons.length === 0;
  return {
    verdict: ship ? 'SHIP' : 'HOLD',
    head_sha: headSha,
    pr: pr.number,
    builders: [...builders].sort(),
    reviewer: ship ? independent[0][0] : null,
    review_id: ship ? independent[0][1].id : null,
    reasons
  };
}

// GitHub commit statuses allow 140 characters of description.
function statusFor(v) {
  const description = v.verdict === 'SHIP'
    ? ('SHIP: approved by ' + v.reviewer + ' on ' + v.head_sha.slice(0, 7) + ', all checks green').slice(0, 140)
    : ('HOLD: ' + v.reasons[0] + (v.reasons.length > 1 ? ' (+' + (v.reasons.length - 1) + ' more)' : '')).slice(0, 140);
  return { state: v.verdict === 'SHIP' ? 'success' : 'failure', context: GATE_CONTEXT, description };
}

module.exports = { verdict, statusFor, GATE_CONTEXT };
