'use strict';
// one-system 01_roles: who is in charge, who may do what, and Heisenberg's stall sweep.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { actingChief, can, findStalls } = require('../gateway/factory/command-chain.js');
const { makeFactory } = require('../gateway/factory/index.js');
const { makeStateStore } = require('../gateway/factory/state-store.js');

let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const ok = (v, m) => { assert.ok(v, m); n++; };

const now = '2026-11-16T12:00:00.000Z';
const minsAgo = (m) => new Date(Date.parse(now) - m * 60000).toISOString();

// Succession: Instinct leads while its heartbeat is fresh; Heisenberg acts when it is stale or missing.
eq(actingChief({ now, instinctLastSeen: minsAgo(3) }).acting, 'instinct', 'fresh heartbeat keeps Instinct in charge');
eq(actingChief({ now, instinctLastSeen: minsAgo(20) }).acting, 'heisenberg', 'stale heartbeat hands command to Heisenberg');
eq(actingChief({ now, instinctLastSeen: null }).acting, 'heisenberg', 'no heartbeat ever recorded: Heisenberg acts');

// Powers.
ok(can('heisenberg', 'assign').ok, 'the foreman assigns');
ok(!can('heisenberg', 'emergency_stop', { acting: 'instinct' }).ok, 'Instinct-only power while Instinct is up');
eq(can('heisenberg', 'emergency_stop', { acting: 'heisenberg' }), { ok: true, via: 'succession' }, 'succession hands over Instinct powers');
ok(!can('heisenberg', 'release_production', { acting: 'heisenberg' }).ok, 'owner-only powers never pass by succession');
ok(!can('instinct', 'release_production').ok, 'even Instinct cannot release to production');
ok(can('owner', 'release_production').ok, 'the owner can');
eq(can('judge', 'verdict', { builderAgentId: 'a1', actorAgentId: 'a1' }).ok, false, 'the builder cannot judge its own work');
ok(can('judge', 'verdict', { builderAgentId: 'a1', actorAgentId: 'qa' }).ok, 'an independent judge can');
ok(!can('worker', 'assign').ok, 'workers cannot assign');

// Stalls: nothing for unassigned or closed work; nudge after 2h, escalate after 6h.
const stalls = findStalls([
  { id: 'i1', assigneeAgentId: 'pi', status: 'todo', updatedAt: minsAgo(30) },
  { id: 'i2', assigneeAgentId: 'pi', status: 'todo', updatedAt: minsAgo(150) },
  { id: 'i3', assigneeAgentId: 'qa', status: 'in_progress', updatedAt: minsAgo(400) },
  { id: 'i4', assigneeAgentId: null, status: 'todo', updatedAt: minsAgo(900) },
  { id: 'i5', assigneeAgentId: 'pi', status: 'done', updatedAt: minsAgo(900) }
], { now });
eq(stalls.map(s => [s.issueId, s.action]), [['i2', 'nudge'], ['i3', 'escalate']], 'only moving-but-stuck assigned work is flagged');

// Factory wiring: heartbeat route and a sweep that acts once per stall.
async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chain-'));
  const calls = { wakes: [], comments: [] };
  const issues = [{ id: 'i2', assigneeAgentId: 'pi', status: 'todo', updatedAt: new Date(Date.now() - 3 * 3600000).toISOString() }];
  const client = {
    listIssues: async () => issues,
    invokeHeartbeat: async (id) => { calls.wakes.push(id); return {}; },
    addComment: async (id, body) => { calls.comments.push([id, body.body]); return {}; }
  };
  const f = makeFactory({ env: {}, overrides: { client, roles: { heisenberg: { agentId: 'h' }, pi: { agentId: 'pi' }, qa: { agentId: 'qa' } }, store: makeStateStore(dir), executors: {} } });

  eq(f.chiefNow().acting, 'heisenberg', 'a fresh install has no Instinct heartbeat yet');
  const res = { code: 0, body: null };
  const helpers = { send: (_r, c, b) => { res.code = c; res.body = b; }, readBody: async () => JSON.stringify({ by: 'instinct' }) };
  await f.handle({ method: 'POST', headers: {} }, null, '/v1/factory/chief/heartbeat', helpers);
  eq([res.code, res.body.acting], [200, 'instinct'], 'Instinct heartbeat restores Instinct as chief');
  const bad = { send: (_r, c, b) => { res.code = c; res.body = b; }, readBody: async () => JSON.stringify({ by: 'someone' }) };
  await f.handle({ method: 'POST', headers: {} }, null, '/v1/factory/chief/heartbeat', bad);
  eq(res.code, 400, 'only Instinct may send the chief heartbeat');

  const first = await f.foremanSweep();
  eq(first.stalls.map(s => s.action), ['nudge'], 'stalled work is nudged');
  eq(calls.wakes, ['pi'], 'the nudge re-wakes the assignee');
  const second = await f.foremanSweep();
  eq(second.stalls, [], 'the same stall is not nudged twice');
  eq(calls.comments.length, 1, 'one comment per stall step');
  console.log('command-chain.test.js: ' + n + ' assertions passed');
}
main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
