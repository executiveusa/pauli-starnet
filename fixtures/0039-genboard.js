const path = require('path');
const R = '/home/user/pauli-starnet';
const { decide, itemFromIssue } = require(R + '/sidecar/district-foreman.js');
const reg = require(R + '/registry/districts.json');
const districts = (reg.districts || reg).map(d => d);
const now = Date.parse('2026-10-24T08:00:00Z');
const items = [
  { number: 101, title: 'Sample approved task', labels: ['district:production','approved'], created_at: '2026-10-24T06:00:00Z' },
  { number: 102, title: 'Sample unapproved task', labels: ['district:impact'], created_at: '2026-10-24T06:00:00Z' },
].map(itemFromIssue);
const state = { lanes: { production: { inflight: null, finished: { 101: { status: 'done', mission_id: 'm-sample', receipt_id: null, at: '2026-10-24T07:50:00.000Z' } }, attempts: {}, last_error: {} } } };
const decisions = decide({ districts, items, state, now, resultsPosted: false });
const board = { at: new Date(now).toISOString(), queued_items: items.length, errors: [], districts: decisions.map(d => { const { item, ...rest } = d; return rest; }) };
// what GET /v1/districts adds (gateway/server.js:633-634), age fixed at 120 s for a deterministic fixture
const ok = { ...board, age_seconds: 120, stale: false };
const stale = { ...board, age_seconds: 1800, stale: true };
const noTick = { status: 503, body: { error: 'NO_FOREMAN_TICK', hint: 'the foreman has not run yet (scripts/district/foreman.js)' } };
console.log(JSON.stringify({ ok, stale, noTick }, null, 1));
