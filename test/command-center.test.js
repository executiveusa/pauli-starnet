/* Command Center desk: pure model + gateway routes.
   Proves: permission cards come from the policy and a new agent starts private; hard denies show as not effective;
   the cost ledger refuses bad rows and says "no data" instead of 0; receipts group by district; the route needs the bearer. */
'use strict';
const A = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { makeCostLedger, summarizeCosts, permissionCards, buildCommandCenter } = require('../gateway/command-center.js');

const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'registry', 'policy.v1.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));

function req(port, method, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: headers || {} }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}

(async () => {
  // permission cards
  const cards = permissionCards(policy, ['hermes', 'brand-new-agent']);
  const by = Object.fromEntries(cards.map(c => [c.agent, c]));
  A.ok(by.hermes.registered, 'hermes is registered');
  const spend = by.hermes.capabilities.find(c => c.capability === 'spend');
  A.ok(!spend, 'hermes was never granted spend');
  A.strictEqual(by['brand-new-agent'].registered, false);
  A.strictEqual(by['brand-new-agent'].tenant_scope, 'private');
  A.deepStrictEqual(by['brand-new-agent'].capabilities, []);
  const alex = by.alex.capabilities;
  A.ok(alex.length > 0, 'alex has granted rows');
  A.ok(alex.filter(c => c.risk !== 'low' || c.capability === 'mission.request').every(c => c.effective || c.denied_by), 'denied rows say why');
  const fanni = by.fanni.capabilities.find(c => c.capability === 'social.prepare');
  A.ok(fanni && fanni.effective === true, 'fanni social.prepare stays effective');
  A.ok(policy.new_agent_default && policy.new_agent_default.tenant_scope === 'private', 'policy declares the private default');

  // synthetic hard-deny: granted capability that a hard deny blocks must show effective:false
  const p2 = JSON.parse(JSON.stringify(policy));
  p2.tenants['shared-platform'].agents.hermes.push('spend');
  const sp = permissionCards(p2, []).find(c => c.agent === 'hermes').capabilities.find(c => c.capability === 'spend');
  A.strictEqual(sp.effective, false);
  A.ok(/spend/.test(sp.denied_by), 'denial reason is shown');

  // cost ledger
  const led = makeCostLedger(path.join(tmp, 'sub', 'costs.jsonl'));
  A.deepStrictEqual(summarizeCosts(led.read()), { has_data: false, total_tokens: null, by_district: [], top_missions: [], rows: 0 });
  A.ok(led.record({ mission_id: 'm1', district: 'creative', tokens_in: 1000, tokens_out: 250, model: 'x/y' }).ok);
  A.ok(led.record({ mission_id: 'm1', district: 'creative', tokens_in: 10, tokens_out: 5 }).ok);
  A.ok(led.record({ mission_id: 'm2', district: 'ops', tokens_in: 7, tokens_out: 3 }).ok);
  for (const bad of [{}, { mission_id: 'm', district: 'ops', tokens_in: -1, tokens_out: 0 }, { mission_id: 'm', district: 'ops', tokens_in: 1.5, tokens_out: 0 },
    { mission_id: 'm', district: '../etc', tokens_in: 1, tokens_out: 1 }, { mission_id: 'a b', district: 'ops', tokens_in: 1, tokens_out: 1 }, { mission_id: 'm', district: 'ops', tokens_in: 'x', tokens_out: 1 }]) {
    A.strictEqual(led.record(bad).ok, false, 'refuses ' + JSON.stringify(bad));
  }
  fs.appendFileSync(path.join(tmp, 'sub', 'costs.jsonl'), '{torn line\n');
  const sum = summarizeCosts(led.read());
  A.strictEqual(sum.total_tokens, 1275);
  A.strictEqual(sum.rows, 3);
  A.deepStrictEqual(sum.by_district.map(d => [d.district, d.tokens, d.missions]), [['creative', 1265, 1], ['ops', 10, 1]]);
  A.strictEqual(sum.top_missions[0].mission_id, 'm1');
  A.strictEqual(fs.statSync(path.join(tmp, 'sub', 'costs.jsonl')).mode & 0o077, 0, 'ledger is owner-only');

  // read model
  const now = Date.parse('2026-10-20T10:00:00Z');
  const cc = buildCommandCenter({
    approvals: [{ id: 'a1', title: 'Send <b>mail</b>', district: 'creative', risk: 'weird', cost: 4 }],
    tasks: [
      { id: 't1', task: 'draft the thing', status: 'completed', context: { district: 'creative', slot: 'writer' }, startedAt: '2026-10-20T09:55:00Z', receipt: { receipt_id: 'r-1111111111' } },
      { id: 't2', task: 'check', status: 'failed', context: { district: 'ops' }, startedAt: '2026-10-20T09:00:00Z' },
      { id: 't3', task: 'no ctx', status: 'running' }
    ],
    costRows: led.read(), policy, rosterIds: ['hermes'], now
  });
  A.strictEqual(cc.approvals.pending, 1);
  A.strictEqual(cc.approvals.items[0].risk, 'medium', 'unknown risk is not trusted as low');
  A.strictEqual(cc.approvals.decide_here, false);
  A.deepStrictEqual(cc.receipts.map(r => r.district), ['city', 'creative', 'ops']);
  const cr = cc.receipts.find(r => r.district === 'creative');
  A.strictEqual(cr.with_receipt, 1);
  A.strictEqual(cr.recent[0].started_ago_min, 5);
  A.strictEqual(cc.receipts.find(r => r.district === 'ops').with_receipt, 0);
  A.strictEqual(cc.cost.total_tokens, 1275);

  // gateway routes
  const PORT = 45000 + Math.floor(Math.random() * 2000);
  const TOKEN = 'cc-test-' + Math.random().toString(36).slice(2);
  const ledgerFile = path.join(tmp, 'gw-costs.jsonl');
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'server.js')], {
    env: Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(PORT), STARNET_PORT: '1', STARNET_COST_LEDGER: ledgerFile,
      STARNET_MISSION_DIR: path.join(tmp, 'missions') }),
    stdio: 'ignore'
  });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await req(PORT, 'GET', '/health', { authorization: 'Bearer ' + TOKEN })).status === 200) break; } catch (_) {} await new Promise(r => setTimeout(r, 200)); }
    const H = { authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' };
    A.strictEqual((await req(PORT, 'GET', '/v1/command-center')).status, 401, 'no bearer, no read');
    A.strictEqual((await req(PORT, 'POST', '/v1/costs', { 'content-type': 'application/json' }, '{}')).status, 401, 'no bearer, no write');
    const bad = await req(PORT, 'POST', '/v1/costs', H, JSON.stringify({ mission_id: 'm9', district: 'ops', tokens_in: -5, tokens_out: 1 }));
    A.strictEqual(bad.status, 400);
    const good = await req(PORT, 'POST', '/v1/costs', H, JSON.stringify({ mission_id: 'm9', district: 'creative', tokens_in: 100, tokens_out: 20 }));
    A.strictEqual(good.status, 201);
    const r = await req(PORT, 'GET', '/v1/command-center', H);
    A.strictEqual(r.status, 200);
    const body = JSON.parse(r.body);
    A.strictEqual(body.cost.total_tokens, 120);
    A.strictEqual(body.policy_loaded, true);
    A.ok(body.permissions.some(c => c.agent === 'hermes'));
    A.strictEqual(body.degraded, true, 'sidecar is down in this test and the page must say so');
    A.ok(!JSON.stringify(body).includes(TOKEN), 'bearer never echoed');
  } finally { child.kill(); }
  console.log('command-center: ok');
})().catch(e => { console.error(e); process.exit(1); });
