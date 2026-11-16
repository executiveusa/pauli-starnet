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
  console.log('control-routes.test.js: ' + n + ' assertions passed');
}
main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
