'use strict';
// one-system 06_pipelines: a Found First run moves stage by stage from Paperclip state, and stops at owner gates.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { nextStep } = require('../gateway/factory/pipelines.js');
const { makeFactory } = require('../gateway/factory/index.js');
const { makeStateStore } = require('../gateway/factory/state-store.js');
const { pipelines } = require('../registry/pipelines.json');
const { loadCity } = require('../gateway/factory/districts.js');

let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const ok = (v, m) => { assert.ok(v, m); n++; };

// Every stage names a real district, and builders/judges that exist (roster ids or factory keys pi/qa) and differ.
const city = loadCity();
const agents = new Set(city.flatMap(d => d.citizens.map(c => c.id)).concat(['pi', 'qa']));
for (const [id, def] of Object.entries(pipelines)) for (const st of def.stages) {
  ok(city.some(d => d.id === st.district), id + '/' + st.name + ': real district');
  ok(agents.has(st.builder) && agents.has(st.judge) && st.builder !== st.judge, id + '/' + st.name + ': real, different builder and judge');
}
eq(nextStep('p', pipelines['found-first-launch'], 'Bad Run', []).action, 'invalid', 'run ids are validated');

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
  const roles = Object.fromEntries(['heisenberg', 'pi', 'qa', 'boring-marketer', 'skeptic', 'michele-torti', 'king-doe', 'jake-van-clief', 'cody-schneider', 'kallaway', 'phlash'].map(k => [k, { agentId: 'ag-' + k }]));
  const store = makeStateStore(fs.mkdtempSync(path.join(os.tmpdir(), 'pipe-')));
  const f = makeFactory({ env: {}, overrides: { client, roles, store, executors: {}, city: [], districtIds: city.map(d => d.id) } });
  const missionOf = (stage) => client.issues.find(i => new RegExp('^\\[sf:revenue\\.found-first-launch\\.acme\\.\\d\\d-' + stage).test(i.title));
  const finish = (stage) => { missionOf(stage).status = 'done'; };

  const r = await f.startPipeline({ pipeline: 'found-first-launch', run: 'acme', subject: 'Acme Roofing, Everett' });
  eq(r.body.step.action, 'submitted', 'starting a run submits its first stage');
  eq(client.issues.find(i => i.parentId === missionOf('scorecard').id).assigneeAgentId, 'ag-boring-marketer', 'stage 1 goes to its builder');

  eq((await f.advanceAllPipelines())[0].step.action, 'wait', 'nothing moves while the stage is open');
  finish('scorecard');
  await f.advanceAllPipelines();
  ok(missionOf('pricing'), 'a finished stage starts the next');
  finish('pricing'); await f.advanceAllPipelines();
  finish('outreach-draft');
  eq((await f.advanceAllPipelines())[0].step.action, 'owner_gate', 'the owner gate holds the run after outreach');
  ok(!client.issues.some(i => /-intake/.test(i.title)), 'no intake before the owner advances');
  const adv = await f.advancePipeline('found-first-launch', 'acme', { owner: true });
  eq(adv.body.step.action, 'submitted', 'the owner advances the run');
  ok(client.issues.some(i => /04-intake/.test(i.title)), 'intake starts after the owner advances');
  eq((await f.advancePipeline('found-first-launch', 'acme', { dryRun: true })).body.step.action, 'wait', 'status is read-only');
  console.log('pipelines.test.js: ' + n + ' assertions passed');
}
main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
