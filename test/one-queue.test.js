'use strict';
// one-system 04_one_queue: Paperclip is the only queue; standing jobs, district builders and judges, the board.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const D = require('../gateway/factory/districts.js');
const { makeFactory } = require('../gateway/factory/index.js');
const { makeStateStore } = require('../gateway/factory/state-store.js');

let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const ok = (v, m) => { assert.ok(v, m); n++; };

// Schedules.
eq(D.parseWhen('weekdays 08:00'), { kind: 'daily', h: 8, min: 0, days: [1, 2, 3, 4, 5] }, 'weekdays');
eq(D.parseWhen('parked'), null, 'unparseable rows are not scheduled');
eq(D.periodKey(D.parseWhen('weekdays 08:00'), '2026-11-16T07:59:00Z'), null, 'not due before its time');
eq(D.periodKey(D.parseWhen('weekdays 08:00'), '2026-11-16T09:00:00Z'), 'd2026-11-16', 'due after its time, once per day');
eq(D.periodKey(D.parseWhen('weekdays 08:00'), '2026-11-15T09:00:00Z'), null, 'not on a Sunday');

// The real city parses: every active district's standing jobs name an agent from its roster or the chain.
const city = D.loadCity();
for (const d of city) for (const s of d.standing) {
  ok(['instinct', 'heisenberg', 'none'].includes(s.agent) || d.citizens.some(c => c.id === s.agent), d.id + ' standing job "' + s.job + '" names a roster agent');
}

// A small city against an in-memory Paperclip.
function memoryPaperclip() {
  const issues = []; let seq = 0;
  return {
    issues,
    listIssues: async (q = {}) => issues.filter(i => (!q.parentIds || i.parentId === q.parentIds) && (!q.status || q.status.split(',').includes(i.status))).map(i => Object.assign({}, i, { description: null })),
    getIssue: async (id) => issues.find(i => i.id === id),
    createIssue: async (b) => { const i = Object.assign({ id: 'iss-' + (++seq), updatedAt: new Date().toISOString() }, b); issues.push(i); return i; },
    patchIssue: async (id, b) => Object.assign(issues.find(i => i.id === id), b),
    addComment: async () => ({}), listComments: async () => [], invokeHeartbeat: async () => ({})
  };
}

async function main() {
  const client = memoryPaperclip();
  const roles = { heisenberg: { agentId: 'h' }, pi: { agentId: 'pi' }, qa: { agentId: 'qa' }, 'boring-marketer': { agentId: 'bm' }, skeptic: { agentId: 'sk' } };
  const smallCity = [
    { id: 'revenue', active: true, citizens: [{ id: 'boring-marketer', status: 'READY', judged_by: 'skeptic' }, { id: 'king-doe', status: 'READY', judged_by: 'skeptic' }],
      standing: D.parseStanding('## Standing jobs\n| When | Job | Agent | Outcome |\n|---|---|---|---|\n| daily 08:00 | Find prospects | boring-marketer | 10 records |\n| daily 09:00 | Follow-ups | king-doe | drafts |\n') },
    { id: 'pauli', active: false, citizens: [{ id: 'pauli', status: 'PARKED', judged_by: 'owner' }],
      standing: D.parseStanding('## Standing jobs\n| When | Job | Agent | Outcome |\n|---|---|---|---|\n| daily 08:00 | Canon pass | pauli | canon |\n') },
    { id: 'command', active: true, citizens: [], standing: [] }
  ];
  const store = makeStateStore(fs.mkdtempSync(path.join(os.tmpdir(), 'oneq-')));
  const fresh = makeFactory({ env: {}, overrides: { client: memoryPaperclip(), roles, store: makeStateStore(fs.mkdtempSync(path.join(os.tmpdir(), 'oneq-new-'))), executors: {}, city: smallCity, districtIds: ['revenue', 'pauli', 'command'] } });
  eq(await fresh.runStanding('2026-11-16T10:00:00Z'), [], 'no standing job runs until the owner approves it');
  const jobId = fresh.standingCatalog().find(j => j.job === 'Find prospects').id;
  eq(fresh.approveStanding(jobId, { approver: 'instinct' }, true).code, 403, 'only the owner approves a standing job');

  const f = makeFactory({ env: {}, overrides: { client, roles, store, executors: {}, city: smallCity, districtIds: ['revenue', 'pauli', 'command'] } });

  for (const j of f.standingCatalog()) if (j.district !== 'pauli') f.approveStanding(j.id, { approver: 'owner' }, true);
  const t = '2026-11-16T10:00:00Z';
  const first = await f.runStanding(t);
  const created = first.filter(x => x.code === 202);
  eq(created.length, 1, 'one mission for the registered agent');
  eq(first.find(x => x.key.includes('Follow-ups')).error, 'AGENT_NOT_REGISTERED', 'an agent missing from Paperclip is reported, not faked');
  ok(!first.some(x => x.key.startsWith('pauli|')), 'a parked district schedules nothing');

  const mission = client.issues.find(i => /^\[sf:revenue\.find-prospects/.test(i.title));
  const spec = JSON.parse(/```starfactory-spec\n([\s\S]*?)\n```/.exec(mission.description)[1]);
  eq([spec.district, spec.builder, spec.judge], ['revenue', 'boring-marketer', 'skeptic'], 'the mission carries its district, builder and judge');
  const child = client.issues.find(i => i.parentId === mission.id);
  eq(child.assigneeAgentId, 'bm', 'the work goes to the named builder, not the default');

  eq((await f.runStanding('2026-11-16T11:00:00Z')).length, 0, 'nothing repeats in the same period');
  eq((await f.runStanding('2026-11-17T10:00:00Z')).filter(x => x.code === 202).length, 1, 'next day, a new mission');

  const board = await f.boardNow();
  const rev = board.find(b => b.id === 'revenue');
  eq([rev.state, rev.running], ['RUNNING', 2], 'the board shows revenue running its two missions, from Paperclip only');
  eq(board.find(b => b.id === 'pauli').state, 'PARKED', 'a parked district with nothing to do shows PARKED');

  // Revoking stops a job; the master switch stops everything without forgetting approvals.
  const fpId = f.standingCatalog().find(j => j.job === 'Find prospects').id;
  f.approveStanding(fpId, { approver: 'owner' }, false);
  eq((await f.runStanding('2026-11-18T10:00:00Z')).filter(x => x.code === 202).length, 0, 'a revoked job no longer runs');
  const offSwitch = makeFactory({ env: { STANDING_AUTOMATION: 'off' }, overrides: { client: memoryPaperclip(), roles, store, executors: {}, city: smallCity, districtIds: ['revenue', 'pauli', 'command'] } });
  offSwitch.approveStanding(fpId, { approver: 'owner' }, true);
  eq(await offSwitch.runStanding('2026-11-19T10:00:00Z'), [], 'STANDING_AUTOMATION=off stops every standing job');

  // Builder and judge must differ, and the judge must be registered.
  const same = await f.heisenberg.submitMission({ mission_id: 'x1', user_intent: 'x', district: 'revenue', builder: 'skeptic', judge: 'skeptic', permissions: ['research'] });
  eq(same.body.error, 'BUILDER_CANNOT_JUDGE', 'the builder cannot be its own judge');
  const bad = await f.heisenberg.submitMission({ mission_id: 'x2', user_intent: 'x', district: 'nowhere', permissions: ['research'] });
  eq(bad.body.error, 'UNKNOWN_DISTRICT', 'missions must name a real district');
  console.log('one-queue.test.js: ' + n + ' assertions passed');
}
main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
