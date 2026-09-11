/* gw-function.test.js — the Netlify gw function is the PUBLIC security boundary of the live
 * city page. These tests prove: writes and unknown paths are refused BEFORE any upstream
 * fetch, visitor headers are never forwarded, the privileged token is attached server-side
 * only to the three allowed reads, public projections omit owner-private state, and no
 * response ever carries the token. Run: node test/gw-function.test.js */
'use strict';
const A = require('assert');

(async () => {
  const PATH = '/.netlify/functions/gw';
  const TOKEN = 'SECRET-TEST-TOKEN-01928374';
  process.env.PAULI_GATEWAY_URL = 'https://gw.test';
  process.env.PAULI_GATEWAY_TOKEN = TOKEN;

  const upstreamCalls = [];
  const RICH_STATUS = {
    degraded: false,
    generatedAt: '2026-09-11T09:00:00.000Z',
    city: { name: "Pauli's Place", status: 'online', secretNote: 'owner-only' },
    districts: [{ id: 'city', agents: 6 }],
    citizens: [
      { id: 'agent', name: 'HEISENBERG', role: 'orchestrator', status: 'online', district: 'command', provider: 'groq', model: 'openai/gpt-oss-120b', system: 'PRIVATE SYSTEM PROMPT' },
      { id: 'ecom-merci', name: 'MERCI', role: 'operator', status: 'online', district: 'commerce' }
    ],
    missions: [{ id: 'm1', title: 'PRIVATE MISSION' }],
    approvals: [{ id: 'a1', title: 'PRIVATE APPROVAL', cost: 500 }],
    experiments: [{ id: 'x1' }],
    revenue: { mrr: 12345 },
    costs: { usd: 678 },
    activeTasks: [
      { id: 't1', status: 'running', task: 'research task', context: { agentId: 'agent', privateNote: 'x' }, startedAt: '2026-09-11T08:00:00Z', completedAt: null, receiptId: 'r-1', internal: 'drop-me' }
    ],
    health: { status: 'online', starnet: { ok: true, port: 4111, host: '10.0.0.5' } }
  };

  globalThis.fetch = async (url, opts) => {
    upstreamCalls.push({ url: String(url), opts });
    if (String(url).endsWith('/v1/city/status')) return new Response(JSON.stringify(RICH_STATUS), { status: 200 });
    if (String(url).includes('/v1/heisenberg/tasks/')) return new Response(JSON.stringify({ id: 't9', task_id: 't9', status: 'completed', task: 'done thing', receipt: { receipt_id: 'r-9', raw_payload: 'PRIVATE' }, logs: 'PRIVATE LOGS' }), { status: 200 });
    return new Response(JSON.stringify({ ok: true, station: { rooms: {} } }), { status: 200 });
  };

  const gw = (await import('../frontend/city/deploy/netlify/functions/gw.mjs')).default;
  let n = 0;
  const ok = (cond, msg) => { A.ok(cond, msg); n++; };

  // --- writes and unknown paths are refused BEFORE any upstream fetch ---
  for (const [method, path] of [
    ['POST', '/v1/city/status'],
    ['POST', '/v1/heisenberg/tasks'],
    ['POST', '/api/run'],
    ['DELETE', '/v1/city/world'],
    ['PUT', '/v1/city/status'],
    ['GET', '/api/status'],
    ['GET', '/v1/city/approvals'],
    ['GET', '/v1/heisenberg/tasks'],
    ['GET', '/v1/city/status/..'],
    ['GET', '/'],
    ['OPTIONS', '/v1/city/status']
  ]) {
    const before = upstreamCalls.length;
    const r = await gw(new Request('https://site.test' + PATH + path, { method }));
    ok(r.status === 404, method + ' ' + path + ' refused with 404 (got ' + r.status + ')');
    ok(upstreamCalls.length === before, method + ' ' + path + ' never reached the upstream gateway');
  }

  // --- allowed GET reads pass, with the token attached server-side ---
  const rs = await gw(new Request('https://site.test' + PATH + '/v1/city/status', {
    headers: { authorization: 'Bearer VISITOR-FORGED-TOKEN', 'x-evil': '1' }
  }));
  ok(rs.status === 200, 'GET /v1/city/status passes');
  const call = upstreamCalls[upstreamCalls.length - 1];
  ok(call.url === 'https://gw.test/v1/city/status', 'upstream URL is exactly the allowlisted path');
  ok(call.opts.headers.authorization === 'Bearer ' + TOKEN, 'the real token is attached server-side');
  ok(!('x-evil' in call.opts.headers) && call.opts.headers.authorization !== 'Bearer VISITOR-FORGED-TOKEN', 'visitor headers are never forwarded');

  const pub = await rs.json();
  const pubStr = JSON.stringify(pub);
  ok(!('approvals' in pub) && !('missions' in pub) && !('experiments' in pub), 'approvals/missions/experiments are omitted from the public status');
  ok(!('revenue' in pub) && !('costs' in pub) && !('districts' in pub), 'revenue/costs/district internals are omitted');
  ok(!pubStr.includes('PRIVATE') && !pubStr.includes('10.0.0.5') && !pubStr.includes('4111') && !pubStr.includes('groq') && !pubStr.includes('system'), 'no owner-private strings, infra details, or provider internals leak');
  ok(pub.citizens.length === 2 && pub.citizens[0].name === 'HEISENBERG', 'truthful roster id/name ride through');
  ok(pub.activeTasks.length === 1 && pub.activeTasks[0].receiptId === 'r-1' && pub.activeTasks[0].context.agentId === 'agent', 'receipts + agent binding ride through');
  ok(pub.health.status === 'online', 'the live/degraded signal survives');

  const rw = await gw(new Request('https://site.test' + PATH + '/v1/city/world'));
  ok(rw.status === 200 && (await rw.json()).ok === true, 'GET /v1/city/world passes through (already a sanitized read-only projection)');

  const rt = await gw(new Request('https://site.test' + PATH + '/v1/heisenberg/tasks/t9'));
  const task = await rt.json();
  ok(rt.status === 200 && task.id === 't9' && task.receiptId === 'r-9', 'GET task receipt read passes');
  ok(!('logs' in task) && !('receipt' in task) && !JSON.stringify(task).includes('PRIVATE'), 'task receipt read is projected, raw receipt/logs stay private');

  // --- the token never appears in ANY response body ---
  for (const r of [rs, rw, rt]) {
    ok(!JSON.stringify(r).includes(TOKEN), 'response never carries the privileged token');
  }

  // --- misconfiguration fails closed ---
  delete process.env.PAULI_GATEWAY_TOKEN;
  const r0 = await gw(new Request('https://site.test' + PATH + '/v1/city/status'));
  ok(r0.status === 503, 'missing token fails closed with 503, no upstream call');
  process.env.PAULI_GATEWAY_TOKEN = TOKEN;

  console.log('gw-function: OK (' + n + ' assertions)');
  process.exit(0);
})().catch(e => { console.error('gw-function FAIL:', e.message); process.exit(1); });
