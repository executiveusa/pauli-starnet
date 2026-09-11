/* test/task-profile.test.js — slim web-research run profile: the cut, its gate, and its fail-closed shape. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const TaskProfile = require('../sidecar/task-profile.js');

function richResolved() {
  // mirrors a real dish-only task run's resolved set (measured on the live station 2026-09-11)
  const tools = ['quest.update', 'deliverable_note', 'tool.search', 'code.run', 'station.inspect', 'routine.notepad', 'todo',
    'team.dispatch', 'team.spawn', 'routine.list', 'session.list', 'task.create', 'city.apply', 'loop.create',
    'web_search', 'web_fetch', 'web_request', 'connectors.list', 'browser.navigate', 'browser.click', 'channel.send'];
  const deferred = ['browser.navigate', 'browser.click'];
  return {
    agentId: 'agent', room: 'desk', hasCompute: true,
    tools, deferred,
    grants: tools.map(t => ({ capId: 'x', tool: t, scope: 'read' })),
    approvalRules: Object.fromEntries(tools.map(t => [t, { requiresConsent: false, scope: 'read', network: true }])),
    networkCaps: Object.fromEntries(tools.map(t => [t, true]))
  };
}

test('gate: only isTask + taskClass web-research slims', () => {
  assert.strictEqual(TaskProfile.isSlimResearchRun({ taskClass: 'web-research' }, true), true);
  assert.strictEqual(TaskProfile.isSlimResearchRun({ taskClass: 'web-research' }, false), false);          // interactive run, never slimmed
  assert.strictEqual(TaskProfile.isSlimResearchRun({}, true), false);
  assert.strictEqual(TaskProfile.isSlimResearchRun({ taskClass: 'Web-Research' }, true), false);            // exact string, no case drift
  assert.strictEqual(TaskProfile.isSlimResearchRun({ taskClass: 'web-research ' }, true), false);
  assert.strictEqual(TaskProfile.isSlimResearchRun(null, true), false);
});

test('cut: only web_search + web_fetch survive; unrelated tools fail closed', () => {
  const out = TaskProfile.slimResearchToolset(richResolved());
  assert.deepStrictEqual(out.tools.sort(), ['web_fetch', 'web_search']);
  // smuggle targets are gone from every consumer structure — gate, grants, deferred reveal, rules:
  for (const t of ['fs_write', 'shell_exec', 'tool.search', 'team.dispatch', 'channel.send', 'web_request', 'connectors.list', 'browser.navigate', 'browser_click']) {
    assert.ok(!out.tools.includes(t), t + ' still granted');
    assert.ok(!out.grants.some(g => g.tool === t), t + ' still in grants');
    assert.ok(!out.deferred.includes(t), t + ' still deferred-revealable');
    assert.ok(!(t in out.approvalRules), t + ' still has approval rule');
  }
  assert.deepStrictEqual(out.deferred, []);                                                                // nothing left for tool.search to reveal
  assert.strictEqual(out.hasCompute, true);                                                                // the run still thinks
  assert.strictEqual(out.room, 'desk');
  // surviving pair keeps its rules/network classification
  assert.strictEqual(out.networkCaps.web_search, true);
  assert.ok(out.approvalRules.web_fetch);
  // non-mutating: the input is unchanged
  const rich = richResolved();
  TaskProfile.slimResearchToolset(rich);
  assert.strictEqual(rich.tools.length, 21);
});

test('cut: a run that only had the two tools is unchanged in shape', () => {
  const minimal = { agentId: 'a', room: null, hasCompute: true, tools: ['web_search', 'web_fetch'], deferred: [], grants: [{ capId: 'web', tool: 'web_search' }, { capId: 'web', tool: 'web_fetch' }], approvalRules: { web_search: { network: true } }, networkCaps: { web_search: true } };
  const out = TaskProfile.slimResearchToolset(minimal);
  assert.deepStrictEqual(out.tools, ['web_search', 'web_fetch']);
  assert.strictEqual(out.hasCompute, true);
});

test('paceProvider: first call immediate, later starts spaced, delegates verbatim', async () => {
  let t = 1000;
  const sleeps = [];
  const fake = {
    id: 'fake',
    stream: async function* (req) { yield { type: 'text', delta: 'x' + req.n }; yield { type: 'done' }; }
  };
  const paced = TaskProfile.paceProvider(fake, 65000, () => t, (ms) => { sleeps.push(ms); t += ms; return Promise.resolve(); });
  assert.strictEqual(paced.id, 'fake');                                   // non-stream members delegate
  const collect = async (n) => { const evs = []; for await (const e of paced.stream({ n })) evs.push(e); return evs; };
  const a = await collect(1);
  assert.deepStrictEqual(a.map(e => e.delta || e.type), ['x1', 'done']);  // events pass through untouched
  assert.deepStrictEqual(sleeps, []);                                     // first call never waits
  t += 10000;                                                             // 10s later
  const b = await collect(2);
  assert.deepStrictEqual(sleeps, [55000]);                                // waits only the remainder of the 65s window
  assert.deepStrictEqual(b.map(e => e.delta || e.type), ['x2', 'done']);
  t += 70000;                                                             // past the window
  await collect(3);
  assert.deepStrictEqual(sleeps, [55000]);                                // no extra wait
});

test('paceProvider: delegate errors propagate', async () => {
  const fake = { stream: async function* () { throw new Error('boom'); } };
  const paced = TaskProfile.paceProvider(fake, 65000);
  await assert.rejects(async () => { for await (const _ of paced.stream({})) {} }, /boom/);
});
