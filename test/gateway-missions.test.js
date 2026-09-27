/* gateway-missions.test.js — StarNet v1 stage 04, gateway side. The mission desk turns a Terabithia MissionEnvelope
   into a foreman run and answers in Terabithia's ResultEnvelope shape. Unit part: tier rule, validation, idempotency,
   needs_human parking, restart recovery. HTTP part: the real gateway against a stub sidecar, 202 then done with crew.
   Run: node test/gateway-missions.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { makeMissionDesk, tierOf, validate } = require('../gateway/missions.js');

const env = (over) => Object.assign({ mission_id: 'm-1', request_id: 'r-1', trace_id: 't-1', target: 'starnet', route: 'city', user_intent: 'brief me', permissions: ['research'] }, over);

function req(method, port, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: headers || {} }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}

(async () => {
  // ---- unit: rules ----
  A.eq(tierOf(env()), 'GREEN', 'declared research permission is GREEN');
  A.eq(tierOf(env({ permissions: [] })), 'YELLOW', 'fail closed: no declared permissions parks, never runs');
  A.eq(tierOf(env({ permissions: undefined })), 'YELLOW', 'fail closed: missing permissions field parks too');
  A.ok(validate(env({ permissions: 'research' })) !== null, 'a non-array permissions value is rejected, not parked');
  A.eq(tierOf(env({ permissions: ['research', 'web.read'] })), 'GREEN', 'read-only research permissions stay GREEN');
  A.eq(tierOf(env({ permissions: ['research', 'social.publish'] })), 'YELLOW', 'anything beyond read-only research is not GREEN');
  A.ok(validate(env({ route: 'personal' })), 'a personal-route envelope is refused');
  A.ok(validate(env({ target: 'pi' })), 'an envelope for another agent is refused');
  A.ok(validate(env({ mission_id: '../../etc' })), 'a path-like mission id is refused');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-missions-'));
  let runs = 0;
  const desk = makeMissionDesk({ stateDir: dir, revision: 'abc1234', runForeman: async b => { runs++; return { status: 'done', summary: 'three points', run_id: 'run-lead', solo: false, crew: [{ agent_id: 'scout-a', run_id: 'run-a', status: 'done' }, { agent_id: 'scout-b', run_id: 'run-b', status: 'done' }] }; } });
  const first = desk.accept(env());
  A.eq(first.code, 202, 'a GREEN mission is accepted as working');
  A.eq(first.body.status, 'working', 'the first answer is working, never done');
  const final = await first.done;
  A.eq(final.status, 'done', 'the mission settles done');
  A.eq(final.crew.length, 2, 'the crew rides the result');
  A.ok(final.evidence.some(e => e.ref === 'starnet://run/run-a') && final.evidence.some(e => e.ref === 'git:abc1234'), 'evidence names each crew run and the deployed revision');
  A.eq(desk.get('m-1').status, 'done', 'the settled result is persisted');
  const again = desk.accept(env());
  A.ok(again.code === 200 && again.body.status === 'done' && runs === 1, 'a retried mission id never runs twice');

  const parked = desk.accept(env({ mission_id: 'm-2', permissions: ['social.publish'] }));
  A.ok(parked.body.status === 'needs_human' && parked.body.human_blocker && parked.body.human_blocker.resume_token === 'm-2', 'a non-GREEN mission is parked for the captain');
  A.eq(runs, 1, 'and never reaches the foreman');

  const failing = makeMissionDesk({ stateDir: dir, runForeman: async () => ({ status: 'failed', reason: 'no model configured for the foreman' }) });
  const f = await failing.accept(env({ mission_id: 'm-3' })).done;
  A.ok(f.status === 'failed' && /no model/.test(f.failures[0]) && f.summary === '', 'a failed run is reported failed, with no summary');

  const hanging = makeMissionDesk({ stateDir: dir, runForeman: () => new Promise(() => {}) });
  hanging.accept(env({ mission_id: 'm-4' }));
  const recovered = makeMissionDesk({ stateDir: dir, runForeman: async () => ({}) }).recoverOnBoot();
  A.eq(recovered, 1, 'a restart finds the in-flight mission');
  A.ok(desk.get('m-4').status === 'failed' && /restarted/.test(desk.get('m-4').failures[0]), 'and marks it failed: interrupted, not working forever');

  // ---- HTTP: the real gateway against a stub sidecar ----
  const GW = 45000 + Math.floor(Math.random() * 2000), SC = GW + 1, TOKEN = 'tok-' + Math.random().toString(36).slice(2);
  let sidecarBody = null;
  const sidecar = http.createServer((q, s) => {
    if (q.url === '/api/missions/run') {
      const c = []; q.on('data', d => c.push(d));
      return q.on('end', () => { sidecarBody = JSON.parse(Buffer.concat(c).toString('utf8')); s.writeHead(200, { 'content-type': 'application/json' }); s.end(JSON.stringify({ mission_id: sidecarBody.mission_id, run_id: 'run-lead', status: 'done', solo: false, summary: 'brief', crew: [{ agent_id: 'scout-a', run_id: 'run-a', status: 'done' }] })); });
    }
    s.writeHead(404); s.end();
  });
  await new Promise(r => sidecar.listen(SC, r));
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-missions-http-'));
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'server.js')], {
    env: Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(GW), STARNET_PORT: String(SC), STARNET_MISSION_DIR: stateDir, STARNET_REVISION: 'abc1234', STARNET_WORKSPACE_PATH: path.join(__dirname, 'fixtures-no-such-dir'), LOG_LEVEL: 'error' }),
    stdio: 'ignore'
  });
  try {
    const auth = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { try { await req('GET', GW, '/health', auth); up = true; } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
    A.ok(up, 'gateway started');
    const noAuth = await req('POST', GW, '/v1/missions', { 'Content-Type': 'application/json' }, JSON.stringify(env({ mission_id: 'h-1' })));
    A.eq(noAuth.status, 401, 'a mission without the gateway bearer is refused');
    const post = await req('POST', GW, '/v1/missions', auth, JSON.stringify(env({ mission_id: 'h-1' })));
    A.eq(post.status, 202, 'POST /v1/missions accepts a GREEN mission (202)');
    let got = null;
    for (let i = 0; i < 40; i++) { got = JSON.parse((await req('GET', GW, '/v1/missions/h-1', auth)).body); if (got.status !== 'working') break; await new Promise(r => setTimeout(r, 100)); }
    A.eq(got.status, 'done', 'GET /v1/missions/:id settles done');
    A.ok(got.crew.length === 1 && got.runtime.revision === 'abc1234', 'the result carries the crew and the revision');
    A.ok(sidecarBody && sidecarBody.tier === 'GREEN' && sidecarBody.intent === 'brief me', 'the sidecar foreman got the intent with tier GREEN');
    A.eq((await req('GET', GW, '/v1/missions/nope', auth)).status, 404, 'an unknown mission is 404');
  } finally {
    child.kill(); sidecar.close();
  }
  A.report('gateway-missions.test');
})().catch(e => { console.error(e); process.exit(1); });
