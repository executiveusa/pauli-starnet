/* gw-function.test.js — the Netlify gw function is the PUBLIC security boundary.
   Adversarial fixtures: nested secrets in every field class, every HTTP verb,
   near-match paths, visitor-forged headers. Both responses are CONSTRUCTED DTOs —
   unknown fields can never ride through. Run: node test/gw-function.test.js */
'use strict';
const A = require('assert');

(async () => {
  const PATH = '/.netlify/functions/gw';
  const TOKEN = 'SECRET-TEST-TOKEN-01928374';
  process.env.PAULI_GATEWAY_URL = 'https://gw.test';
  process.env.PAULI_GATEWAY_TOKEN = TOKEN;

  const upstreamCalls = [];
  const POISON = 'sk-live-LEAK-01928374';
  const ADVERSARIAL_STATUS = {
    degraded: false,
    generatedAt: '2026-09-11T09:00:00.000Z',
    token: TOKEN, api_key: POISON, env: { PAULI_GATEWAY_TOKEN: TOKEN },
    city: { name: "Pauli's Place", status: 'online', secretNote: POISON },
    districts: [{ id: 'city', agents: 6, private: POISON }],
    citizens: [
      { id: 'agent', name: 'HEISENBERG', role: 'orchestrator', status: 'online', district: 'command',
        provider: 'groq', model: 'openai/gpt-oss-120b', org: 'org-secret', quota: { tpd: 200000 },
        system: 'PRIVATE SYSTEM PROMPT ' + POISON, nested: { deep: { token: POISON } } },
      { id: 'ecom-merci', name: 'MERCI', role: 'operator', status: 'online', district: 'commerce', prompt: POISON }
    ],
    missions: [{ id: 'm1', title: 'PRIVATE ' + POISON }],
    approvals: [{ id: 'a1', title: 'PRIVATE', cost: 500 }],
    experiments: [{ id: 'x1', secret: POISON }],
    revenue: { mrr: 12345 }, costs: { usd: 678 },
    activeTasks: [
      { id: 'internal-task-uuid-1', status: 'running', task: 'research Node LTS ' + 'x'.repeat(400),
        context: { agentId: 'agent', privateNote: POISON }, error: 'Groq 429 org quota ' + POISON,
        startedAt: '2026-09-11T08:50:00.000Z', completedAt: null, receiptId: 'internal-receipt-uuid-1',
        provider: 'groq', model: 'gpt-oss', retry: { after: POISON } },
      { id: 'internal-task-uuid-2', status: 'failed', task: 'hello', context: { agentId: 'ecom-merci' },
        error: POISON, startedAt: '2026-09-11T08:40:00.000Z', completedAt: '2026-09-11T08:45:00.000Z', receiptId: null }
    ],
    health: { status: 'online', starnet: { ok: true, port: 4111, host: '10.0.0.5' } }
  };
  const ADVERSARIAL_WORLD = {
    ok: true,
    generatedAt: '2026-09-11T09:00:00.000Z',
    token: TOKEN,
    station: {
      schema: 'starnet.station', version: 1, _nid: 99,
      meta: { name: "PAULI'S PLACE", createdAt: 123, tier: 0, spawnRoomId: 'r1', trunkRoomId: 'r1', secret: POISON },
      rooms: {
        r1: { id: 'r1', kind: 'hab', name: 'HQ', rects: [{ x1: 0, y1: 0, x2: 17, y2: 10, token: POISON }],
              floorStyle: 'hull', wallStyle: 'hull', tier: 0, floorPaint: {}, secret: POISON, nested: { token: POISON } }
      },
      order: ['r1'],
      props: [
        { id: 'p1', t: 'desk', x: 2, y: 1, w: 2, h: 1, agentId: 'agent', brief: 'PRIVATE BRIEF ' + POISON, skin: 'x', secret: POISON },
        { id: 'p2', t: 'bay', x: 5, y: 8, w: 2, h: 1, agentId: 'ecom-merci' },
        { id: 'p3', t: 'crate', x: 9, y: 8, w: 2, h: 1 }
      ],
      belts: { '1,1': 'E', evil: POISON.repeat(20) },
      edges: [{ from: 'agent', to: 'ecom-merci', whenKind: 'handoff', secret: POISON }],
      secretTop: POISON
    }
  };

  globalThis.fetch = async (url, opts) => {
    upstreamCalls.push({ url: String(url), opts });
    if (String(url).endsWith('/v1/city/status')) return new Response(JSON.stringify(ADVERSARIAL_STATUS), { status: 200 });
    if (String(url).endsWith('/v1/city/world')) return new Response(JSON.stringify(ADVERSARIAL_WORLD), { status: 200 });
    return new Response('nope', { status: 404 });
  };

  const gw = (await import('../frontend/city/deploy/netlify/functions/gw.mjs')).default;
  let n = 0;
  const ok = (cond, msg) => { A.ok(cond, msg); n++; };

  // --- every verb + near-match paths refused BEFORE upstream ---
  for (const [method, path] of [
    ['POST', '/v1/city/status'], ['PUT', '/v1/city/status'], ['PATCH', '/v1/city/status'],
    ['DELETE', '/v1/city/status'], ['OPTIONS', '/v1/city/status'], ['HEAD', '/v1/city/status'],
    ['POST', '/v1/city/world'], ['DELETE', '/v1/city/world'],
    ['POST', '/v1/heisenberg/tasks'], ['GET', '/v1/heisenberg/tasks'], ['GET', '/v1/heisenberg/tasks/abc-123'],
    ['POST', '/api/run'], ['GET', '/api/status'], ['GET', '/api/run'],
    ['GET', '/v1/city'], ['GET', '/v1/city/'], ['GET', '/v1/city/status/'], ['GET', '/v1/city/statusx'],
    ['GET', '/'], ['GET', ''],
  ]) {
    const before = upstreamCalls.length;
    const r = await gw(new Request('https://site.test' + PATH + path, { method }));
    ok(r.status === 404, method + ' ' + path + ' refused (got ' + r.status + ')');
    ok(upstreamCalls.length === before, method + ' ' + path + ' never reached upstream');
  }

  // a query string never reaches the upstream (fetch is GW + sub, no search) — it is ignored,
  // and the DTO can never reflect it back.
  {
    const before = upstreamCalls.length;
    const r = await gw(new Request('https://site.test' + PATH + '/v1/city/status?token=' + TOKEN));
    ok(r.status === 200, 'query string on an allowed read is ignored');
    ok(!upstreamCalls[before].url.includes('token='), 'query never forwarded upstream');
    ok(!JSON.stringify(await r.json()).includes(TOKEN), 'response never reflects the query');
  }

  // dot-segments: URL normalization resolves them BEFORE the allowlist matches, so the best
  // an attacker gets is a DIFFERENT allowlisted read — never an unlisted path.
  {
    const r = await gw(new Request('https://site.test' + PATH + '/v1/city/status/../world'));
    ok(r.status === 200, 'dot-segment path normalizes to the allowlisted world read');
    ok((await r.json()).ok === true, 'and serves only the world DTO');
  }

  // --- status DTO ---
  const rs = await gw(new Request('https://site.test' + PATH + '/v1/city/status', {
    headers: { authorization: 'Bearer VISITOR-FORGED', cookie: 'session=' + POISON }
  }));
  ok(rs.status === 200, 'status read passes');
  const call = upstreamCalls[upstreamCalls.length - 1];
  ok(call.opts.headers.authorization === 'Bearer ' + TOKEN && !('cookie' in call.opts.headers), 'server-side token only; visitor headers dropped');
  const pub = await rs.json();
  const pubStr = JSON.stringify(pub);
  ok(!pubStr.includes(POISON) && !pubStr.includes(TOKEN), 'no secret string anywhere in the status DTO');
  for (const k of ['approvals', 'missions', 'experiments', 'revenue', 'costs', 'districts', 'health', 'degraded', 'generatedAt', 'token', 'api_key', 'env'])
    ok(!(k in pub), 'status DTO omits ' + k);
  ok(pub.live === true && pub.city.name === "Pauli's Place", 'live signal + city name');
  ok(pub.citizens.length === 2 && pub.citizens[0].name === 'HEISENBERG' && pub.citizens[0].hero === true, 'truthful roster names/roles, hero marked');
  ok(!pubStr.includes('ecom-merci'), 'internal agent ids never appear');
  ok(pub.citizens.every(c => !('id' in c)), 'citizens carry no internal id field');
  ok(pub.activity.every(t => t.agent !== 'agent' && t.agent !== 'ecom-merci'), 'activity binds public names only');
  ok(!pubStr.includes('groq') && !pubStr.includes('gpt-oss') && !pubStr.includes('org-secret') && !pubStr.includes('tpd'), 'no provider/model/org/quota');
  ok(!pubStr.includes('internal-task-uuid') && !pubStr.includes('internal-receipt-uuid'), 'no internal task/receipt ids');
  ok(!pubStr.includes('429') && !pubStr.includes('error'), 'no raw errors');
  ok(pub.activity.length === 2 && pub.activity[0].event.startsWith('ev_') && !pubStr.includes('2026-09-11'), 'opaque event ids, no exact timestamps');
  ok(pub.activity[0].state === 'running' && pub.activity[0].agent === 'HEISENBERG', 'work binds by public agent name');
  ok(pub.activity[0].summary.length <= 80 && !pub.activity[0].summary.includes('\n'), 'summaries clipped to a short single line');
  ok(pub.activity[0].receipt === true && pub.activity[1].receipt === false, 'receipt presence is a boolean');
  ok(typeof pub.activity[0].startedAgoMin === 'number', 'relative ages only');

  // --- world DTO ---
  const rw = await gw(new Request('https://site.test' + PATH + '/v1/city/world'));
  ok(rw.status === 200, 'world read passes');
  const world = await rw.json();
  const wStr = JSON.stringify(world);
  ok(!wStr.includes(POISON) && !wStr.includes(TOKEN), 'no secret string anywhere in the world DTO');
  ok(!wStr.includes('_nid') && !wStr.includes('createdAt') && !wStr.includes('secret') && !wStr.includes('brief') && !wStr.includes('skin'), 'unknown/nested/brief/skin fields never forward');
  ok(world.ok === true && world.station.rooms.r1.name === 'HQ', 'geometry survives');
  ok(world.station.rooms.r1.rects[0].x2 === 17 && !('token' in world.station.rooms.r1.rects[0]), 'rects cleaned');
  ok(world.station.props[0].agentId === 'HEISENBERG' && world.station.props[1].agentId === 'MERCI' && !('agentId' in world.station.props[2]), 'prop bindings rewritten to public names');
  ok(world.station.edges[0].from === 'HEISENBERG' && world.station.edges[0].to === 'MERCI', 'edges rewritten to public names');
  ok(world.station.belts['1,1'] === 'E' && !('evil' in world.station.belts), 'belts cleaned');
  ok(world.station.meta.spawnRoomId === 'r1' && !('secret' in world.station.meta), 'meta allowlisted');

  // --- fail closed ---
  delete process.env.PAULI_GATEWAY_TOKEN;
  const r0 = await gw(new Request('https://site.test' + PATH + '/v1/city/status'));
  ok(r0.status === 503, 'missing token fails closed');
  process.env.PAULI_GATEWAY_TOKEN = TOKEN;

  console.log('gw-function: OK (' + n + ' assertions)');
  process.exit(0);
})().catch(e => { console.error('gw-function FAIL:', e.stack || e.message); process.exit(1); });
