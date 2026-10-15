/* sidecar/district-foreman.js — Heisenberg's per-district decision, PURE (program/city-247/CONTEXT.md).

   Every tick the foreman answers one question per district: what does this district do now?
     RUNNING  — one approved item is in flight (one per district, never two)
     DISPATCH — start this approved item now (within budget and the retry limit)
     BLOCKED  — work exists but cannot run; `question` says exactly what the owner must do
     IDLE     — nothing approved is waiting, or the lane is not active; `reason` says which

   Never fake activity: a district with no authorized work is IDLE or BLOCKED, never "busy". This file has no
   clock, no fs, no network: `now` and all state come in as arguments so the decision is testable and replayable.
   The ambient half (GitHub reads, mission dispatch, state file) is scripts/district/foreman.js. */
'use strict';

const DONE_STATES = new Set(['done', 'needs_human', 'cancelled']);

function utcDay(now) { return new Date(now).toISOString().slice(0, 10); }

// A GitHub issue -> a work item. Labels carry the decisions; the body carries the brief.
function itemFromIssue(issue) {
  const labels = (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name)).filter(Boolean);
  const perms = labels.filter(l => l.startsWith('perm:')).map(l => l.slice(5));
  const body = issue.body || '';
  const q = body.match(/^\s*Question:\s*(.+)$/mi);
  return {
    number: issue.number,
    title: issue.title,
    body,
    url: issue.html_url || null,
    created_at: issue.created_at || null,
    district: (labels.find(l => l.startsWith('district:')) || '').slice(9) || null,
    approved: labels.includes('approved'),
    blocked: labels.includes('blocked'),
    permissions: perms.length ? perms : ['research'],
    question: q ? q[1].trim() : null,
    is_pr: !!issue.pull_request
  };
}

function laneState(state, id) {
  const s = (state && state.districts && state.districts[id]) || {};
  return { inflight: s.inflight || null, attempts: s.attempts || {}, last_error: s.last_error || {}, finished: s.finished || {}, spend: s.spend || null };
}

function spentToday(lane, now) {
  return lane.spend && lane.spend.day === utcDay(now) ? Number(lane.spend.usd) || 0 : 0;
}

function decideDistrict(district, items, lane, now, queueErrors = {}) {
  const mine = items.filter(i => i.district === district.id && !i.is_pr);
  const base = { district: district.id, active: district.active, queued: mine.length };

  if (lane.inflight) return { ...base, action: 'RUNNING', issue: lane.inflight.issue, mission_id: lane.inflight.mission_id };
  if (!district.active) return { ...base, action: 'IDLE', reason: mine.length ? 'lane not active yet; ' + mine.length + ' item(s) wait for it' : 'lane not active yet' };
  // An unreadable queue is not an empty one: never report IDLE when we could not look.
  const qerr = district.queue && queueErrors[district.queue.repo];
  if (qerr) return { ...base, action: 'BLOCKED', question: 'Queue ' + district.queue.repo + ' cannot be read: ' + qerr };

  const spent = spentToday(lane, now);
  // Oldest first everywhere (GitHub lists newest first), so the first item of a lane is the one named and run first.
  const open = mine.filter(i => !lane.finished[i.number])
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.number - b.number);
  const exhausted = open.filter(i => (lane.attempts[i.number] || 0) >= district.max_attempts);
  const runnable = open
    .filter(i => i.approved && !i.blocked && (lane.attempts[i.number] || 0) < district.max_attempts);

  if (runnable.length && spent >= district.daily_usd_cap) {
    return { ...base, action: 'BLOCKED', question: 'Daily budget used ($' + spent.toFixed(2) + ' of $' + district.daily_usd_cap.toFixed(2) + '). Raise the cap or it resumes after 00:00 UTC.' };
  }
  if (runnable.length) {
    const item = runnable[0];
    const unattended = new Set(district.unattended_permissions);
    if (!item.permissions.every(p => unattended.has(p))) {
      return { ...base, action: 'BLOCKED', issue: item.number, question: '#' + item.number + ' asks for ' + item.permissions.join(', ') + ', which this district may not run unattended. Run it with the owner, or change its perm: labels.' };
    }
    return { ...base, action: 'DISPATCH', issue: item.number, attempt: (lane.attempts[item.number] || 0) + 1, item };
  }
  const parked = mine.filter(i => lane.finished[i.number] && lane.finished[i.number].status === 'needs_human');
  if (parked.length) {
    const f = lane.finished[parked[0].number];
    return { ...base, action: 'BLOCKED', issue: parked[0].number, question: '#' + parked[0].number + ' waits for the owner: ' + (f.why || 'approval needed') + ' (mission ' + f.mission_id + ')' };
  }
  const blocked = open.filter(i => i.blocked);
  if (blocked.length) return { ...base, action: 'BLOCKED', issue: blocked[0].number, question: '#' + blocked[0].number + ' ' + (blocked[0].question || blocked[0].title) };
  if (exhausted.length) {
    const i = exhausted[0];
    return { ...base, action: 'BLOCKED', issue: i.number, question: '#' + i.number + ' failed ' + district.max_attempts + ' times: ' + (lane.last_error[i.number] || 'unknown error') + '. Fix the brief or close it.' };
  }
  const waiting = open.filter(i => !i.approved);
  if (waiting.length) {
    return { ...base, action: 'BLOCKED', issue: waiting[0].number, question: 'Approve ' + waiting.slice(0, 3).map(i => '#' + i.number + ' "' + i.title + '"').join(', ') + ' (add the label "approved") to start.' };
  }
  return { ...base, action: 'IDLE', reason: 'no work queued: open an issue labeled district:' + district.id };
}

// The whole city, one tick. maxDispatch bounds how many missions one tick may start across all districts.
function decide({ districts, items, state, now, maxDispatch = 3, queueErrors = {} }) {
  let budget = maxDispatch;
  return districts.map(d => {
    const out = decideDistrict(d, items, laneState(state, d.id), now, queueErrors);
    if (out.action === 'DISPATCH') {
      if (budget <= 0) return { ...out, action: 'IDLE', reason: 'waiting for a dispatch slot this tick' };
      budget--;
    }
    return out;
  });
}

// Fold a settled mission result back into a district's state. Returns the new lane state (input untouched).
function settle(laneIn, inflight, result, now) {
  const lane = JSON.parse(JSON.stringify(laneIn || {}));
  lane.attempts = lane.attempts || {}; lane.last_error = lane.last_error || {}; lane.finished = lane.finished || {};
  const n = inflight.issue;
  const usd = Number(result && result.runtime && result.runtime.usd) || 0;
  const day = utcDay(now);
  lane.spend = lane.spend && lane.spend.day === day ? { day, usd: lane.spend.usd + usd } : { day, usd };
  if (result && result.status === 'working') return lane;            // still running: caller keeps inflight
  lane.inflight = null;
  if (result && DONE_STATES.has(result.status)) {
    lane.finished[n] = { status: result.status, mission_id: inflight.mission_id, receipt_id: result.receipt_id || null, at: new Date(now).toISOString() };
    if (result.status === 'needs_human') lane.finished[n].why = String((result.human_blocker && result.human_blocker.why) || result.summary || '').slice(0, 200);
  } else {
    lane.attempts[n] = (lane.attempts[n] || 0) + 1;
    lane.last_error[n] = ((result && result.failures && result.failures[0]) || 'mission failed').slice(0, 200);
  }
  return lane;
}

module.exports = { decide, decideDistrict, itemFromIssue, settle, utcDay };
