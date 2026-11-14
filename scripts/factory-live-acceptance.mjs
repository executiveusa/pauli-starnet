#!/usr/bin/env node
/* STARFACTORY-001 live acceptance. Runs against a REAL deployment (gateway + Paperclip + Hermes/Pi workers), not a double.
   It never fabricates a result: any step it cannot observe is reported BLOCKED/NOT_RUN with the reason.
     FACTORY_GATEWAY_URL   e.g. https://<private-gateway>      FACTORY_OWNER_TOKEN   owner bearer
   Options: --timeout-min=N (default 30)   --evidence=path.json (default factory-live-evidence.json)
   Exit code 0 only when every executed step passed AND none were blocked. */
import fs from 'node:fs';

const arg = (k, d) => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1] || d;
const base = (process.env.FACTORY_GATEWAY_URL || '').replace(/\/+$/, '');
const owner = process.env.FACTORY_OWNER_TOKEN || '';
const timeoutMs = Number(arg('timeout-min', '30')) * 60000;
const evidenceFile = arg('evidence', 'factory-live-evidence.json');
const results = [];
const rec = (id, name, status, detail) => { results.push({ id, name, status, detail: detail || null, at: new Date().toISOString() }); console.log((status === 'PASS' ? 'PASS ' : status + ' ').padEnd(8) + id + ' ' + name + (detail ? ' :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); };

if (!base || !owner) { console.error('FACTORY_GATEWAY_URL and FACTORY_OWNER_TOKEN are required. Nothing was run.'); process.exit(2); }

async function api(method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = 'Bearer ' + (token || owner);
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch { /* non-json */ }
  return { code: res.status, body: j };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// T15: unauthenticated access is refused.
{ const r = await api('GET', '/v1/factory/state', undefined, null); rec('T15', 'unauthenticated state request is refused', r.code === 401 ? 'PASS' : 'FAIL', 'HTTP ' + r.code); }

// Baseline: the read model answers and every state has evidence.
const st = await api('GET', '/v1/factory/state');
if (st.code !== 200) { rec('BASE', 'factory state is reachable', 'FAIL', 'HTTP ' + st.code + ' (is PAPERCLIP_URL configured on the gateway?)'); finish(); }
rec('T20', 'every agent state carries evidence', Object.values(st.body.agents).every(a => a.evidence && a.evidence.source) ? 'PASS' : 'FAIL', Object.fromEntries(Object.entries(st.body.agents).map(([k, a]) => [k, a.state + '/' + a.evidence.source])));

// T10: a restricted permission parks the mission and creates no worker task.
const parkId = 'LIVE-PARK-' + Date.now();
{ const r = await api('POST', '/v1/factory/missions', { mission_id: parkId, user_intent: 'Live acceptance: restricted-permission probe (do nothing)', permissions: ['repo.edit', 'deploy'] });
  const s = await api('GET', '/v1/factory/missions/' + parkId);
  rec('T10', 'restricted permission parks the mission with no tasks', r.body && r.body.status === 'blocked' && s.body && s.body.tasks.length === 0 ? 'PASS' : 'FAIL', { submit: r.code, tasks: s.body && s.body.tasks.length }); }

// T02/T03/T04/T05/T17/T19: one real mission through implement -> independent review (-> repair -> review) -> owner hold.
const mid = 'LIVE-' + Date.now();
const sub = await api('POST', '/v1/factory/missions', { mission_id: mid, user_intent: process.env.FACTORY_LIVE_INTENT || 'Live acceptance: make one small, reversible, documented change on an isolated branch and open a PR. Do not merge or deploy.', permissions: ['read', 'repo.edit', 'pr.create'], budget_usd: Number(process.env.FACTORY_LIVE_BUDGET_USD || 2) });
rec('T02', 'mission accepted into Paperclip', sub.code === 202 ? 'PASS' : 'FAIL', 'HTTP ' + sub.code);
const deadline = Date.now() + timeoutMs; let last = null;
while (Date.now() < deadline) {
  const s = await api('GET', '/v1/factory/missions/' + mid); last = s.body;
  if (last && (last.status === 'in_review' || last.status === 'blocked' || last.status === 'done')) break;
  await sleep(5000);
}
if (!last || last.status !== 'in_review') rec('T19', 'mission reached owner hold without manual relaying', 'FAIL', last ? { status: last.status, next: last.next, tasks: last.tasks } : 'no mission status');
else {
  const stages = last.tasks.map(t => t.stage + ':' + t.seq);
  rec('T19', 'mission reached owner hold without manual relaying', 'PASS', stages);
  const qa = Object.values(last.verdicts);
  const builders = new Set(last.tasks.filter(t => t.stage !== 'review').map(t => t.assigneeAgentId));
  rec('T04', 'a separate reviewer recorded a verdict', qa.length > 0 && qa.every(v => !builders.has(v.authorAgentId)) ? 'PASS' : 'FAIL', qa.map(v => v.verdict + ' by ' + v.authorAgentId));
  rec('T03', 'two or more workers handled the mission', new Set(last.tasks.map(t => t.assigneeAgentId)).size >= 2 ? 'PASS' : 'FAIL', [...new Set(last.tasks.map(t => t.assigneeAgentId))]);
  const f = last.tasks.some(t => t.stage === 'repair');
  rec('T05', 'failed review returned to the builder', f ? 'PASS' : 'NOT_RUN', f ? 'a repair task followed a FAIL verdict' : 'the reviewer passed on the first attempt; not exercised by this run');
}
// Steps that cannot be induced remotely are reported, not assumed.
rec('T01', 'Paperclip restart preserves the mission', 'NOT_RUN', 'requires operator action on the host: restart Paperclip, then re-GET /v1/factory/missions/' + mid);
rec('T06', 'worker crash recovery', 'NOT_RUN', 'requires operator action on the host: kill the gateway mid-run, restart, confirm resume or visible failure');
rec('T12', 'authenticated phone voice command', 'NOT_RUN', 'requires the owner phone and the Command Center path');
rec('T13', 'on-demand specialist wake -> idle', 'NOT_RUN', 'no specialist capability is registered by this change');
rec('T18', 'control service independent of the desktop', 'NOT_RUN', 'requires closing the desktop app while the mission runs on the server');

finish();
function finish() {
  fs.writeFileSync(evidenceFile, JSON.stringify({ generatedAt: new Date().toISOString(), gateway: base, mission: mid, results }, null, 2));
  const bad = results.filter(r => r.status === 'FAIL').length; const open = results.filter(r => r.status === 'NOT_RUN' || r.status === 'BLOCKED').length;
  console.log('\n' + results.length + ' steps: ' + results.filter(r => r.status === 'PASS').length + ' pass, ' + bad + ' fail, ' + open + ' not run. Evidence: ' + evidenceFile);
  process.exit(bad === 0 && open === 0 ? 0 : 1);
}
