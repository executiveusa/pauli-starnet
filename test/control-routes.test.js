'use strict';
// one-system 07: the owner can see every agent and give any registered agent a task directly.
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { makeFactory } = require('../gateway/factory/index.js');
const { makeStateStore } = require('../gateway/factory/state-store.js');
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const issues = []; let seq = 0;
const client = {
  listIssues: async (q = {}) => issues.filter(i => !q.parentIds || i.parentId === q.parentIds).map(i => Object.assign({}, i, { description: null })),
  getIssue: async (id) => issues.find(i => i.id === id),
  createIssue: async (b) => { const i = Object.assign({ id: 'i' + (++seq) }, b); issues.push(i); return i; },
  patchIssue: async () => ({}), addComment: async () => ({}), listComments: async () => []
};
const roles = { heisenberg: { agentId: 'h' }, pi: { agentId: 'p' }, qa: { agentId: 'q' }, 'king-doe': { agentId: 'k' }, skeptic: { agentId: 's' } };
const f = makeFactory({ env: {}, overrides: { client, roles, store: makeStateStore(fs.mkdtempSync(path.join(os.tmpdir(), 'ctl-'))), executors: {} } });
async function main() {
  const agents = f.agentsNow();
  eq(agents.find(a => a.id === 'king-doe').registered, true, 'registered agents are marked');
  eq(agents.find(a => a.id === 'kallaway').registered, false, 'unregistered agents are shown as such, not hidden');
  const r = await f.directTask('king-doe', { intent: 'Draft a discovery script for Acme Roofing' });
  eq(r.code, 202, 'the owner can task an agent directly');
  const child = issues.find(i => i.parentId);
  eq(child.assigneeAgentId, 'k', 'the task goes to that agent');
  const spec = JSON.parse(/```starfactory-spec\n([\s\S]*?)\n```/.exec(issues.find(i => !i.parentId).description)[1]);
  eq([spec.district, spec.judge], ['revenue', 'skeptic'], 'in its own district, judged by its roster judge');
  eq((await f.directTask('nobody', { intent: 'x' })).code, 404, 'unknown agents are refused');
  eq((await f.directTask('kallaway', { intent: 'x' })).body.error, 'AGENT_NOT_REGISTERED', 'unregistered agents are refused with the reason');
  eq((await f.directTask('king-doe', {})).code, 400, 'a task needs an intent');
  // Chain of command: a direct task is an override and the chief is told; owner orders wait for the chain's ack.
  const notices = f.openOrders().filter(o => o.kind === 'override_notice');
  eq([notices.length, notices[0].agent, notices[0].to], [1, 'king-doe', 'heisenberg'], 'a direct task leaves an override notice for the acting chief');
  const o = f.addOrder('order', 'Get the first three Found First prospects scored this week');
  eq(f.openOrders().some(x => x.id === o.id), true, 'an owner order stays open until acknowledged');
  eq(f.ackOrder(o.id, 'king-doe').code, 400, 'only Instinct or Heisenberg acknowledges an order');
  eq(f.ackOrder(o.id, 'instinct').code, 200, 'the chief acknowledges by id');
  eq(f.openOrders().some(x => x.id === o.id), false, 'an acknowledged order is closed');
  const late = makeFactory({ env: { ORDER_ACK_MS: '1' }, overrides: { client, roles, store: makeStateStore(fs.mkdtempSync(path.join(os.tmpdir(), 'ctl2-'))), executors: {} } });
  const lo = late.addOrder('order', 'x');
  await new Promise(r => setTimeout(r, 5));
  eq((await late.foremanSweep()).overdue_orders, [lo.id], 'an order not acknowledged in time is flagged once by the sweep');
  eq((await late.foremanSweep()).overdue_orders, [], 'and not flagged again');
  // A second key guards owner approvals, because Instinct holds the gateway bearer too.
  const keyed = makeFactory({ env: { OWNER_APPROVAL_TOKEN: 'owner-key' }, overrides: { client, roles, store: makeStateStore(fs.mkdtempSync(path.join(os.tmpdir(), 'ctl3-'))), executors: {} } });
  async function post(url, headers) {
    let code = 0;
    const req = { method: 'POST', headers: headers || {} };
    await keyed.handle(req, {}, url, { send: (_r, c) => { code = c; }, readBody: async () => JSON.stringify({ approver: 'owner' }) });
    return code;
  }
  const jid = keyed.standingCatalog()[0].id;
  eq(await post('/v1/factory/standing/' + jid + '/approve'), 403, 'without the owner key a standing job cannot be approved');
  eq(await post('/v1/factory/standing/' + jid + '/approve', { 'x-owner-approval': 'wrong' }), 403, 'a wrong owner key is refused');
  eq(await post('/v1/factory/standing/' + jid + '/approve', { 'x-owner-approval': 'owner-key' }), 200, 'the owner key approves');
  eq(await post('/v1/factory/standing/' + jid + '/revoke'), 200, 'stopping a job needs no owner key');
  console.log('control-routes.test.js: ' + n + ' assertions passed');
}
main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
