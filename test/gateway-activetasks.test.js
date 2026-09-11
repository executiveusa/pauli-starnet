/* Gateway activeTasks — proves /v1/city/status exposes proven in-flight and settled
   task activity (with routing context) so every city viewer sees the same truth,
   and that the degraded payload keeps the same shape. */
'use strict';
const A = require('./_assert.js');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const GW_PORT = 43000 + Math.floor(Math.random() * 2000);
const SC_PORT = GW_PORT + 1;
const TOKEN = 'test-token-' + Math.random().toString(36).slice(2);

function req(method, port, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: headers || {} }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  let runBody = null;   // the exact body the gateway POSTed to the sidecar's /api/run
  // stub sidecar: healthy status + one-shot NDJSON run
  const sidecar = http.createServer((q, s) => {
    if (q.url === '/api/status') {
      s.writeHead(200, { 'content-type': 'application/json' });
      return s.end(JSON.stringify({ ok: true }));
    }
    if (q.url === '/api/run') {
      const chunks = [];
      q.on('data', c => chunks.push(c));
      return q.on('end', () => {
        try { runBody = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { runBody = null; }
        s.writeHead(200, { 'content-type': 'application/x-ndjson' });
        s.write(JSON.stringify({ name: 'agent.token', payload: { delta: 'PROBE OK' } }) + '\n');
        return s.end(JSON.stringify({ name: 'agent.run.end', payload: { reason: 'done' } }) + '\n');
      });
    }
    s.writeHead(404); s.end();
  });
  await new Promise(r => sidecar.listen(SC_PORT, r));

  const child = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'server.js')], {
    env: Object.assign({}, process.env, {
      GATEWAY_BEARER_TOKEN: TOKEN,
      GATEWAY_PORT: String(GW_PORT),
      STARNET_PORT: String(SC_PORT),
      STARNET_WORKSPACE_PATH: path.join(__dirname, 'fixtures-no-such-dir'),
      LOG_LEVEL: 'error'
    }),
    stdio: 'ignore'
  });
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { await req('GET', GW_PORT, '/health', { Authorization: 'Bearer ' + TOKEN }); up = true; break; }
    catch (_) { await new Promise(r => setTimeout(r, 250)); }
  }
  A.ok(up, 'gateway started');

  const auth = { Authorization: 'Bearer ' + TOKEN };
  const before = JSON.parse((await req('GET', GW_PORT, '/v1/city/status', auth)).body);
  A.eq(before.activeTasks, [], 'no tasks dispatched means no claimed activity');

  const taskBody = JSON.stringify({ task: 'probe', context: { source: 'city-web', district: 'commerce', building: 'commerce_factory', slot: 'operator', agentId: 'ecom-merci' } });
  const posted = JSON.parse((await req('POST', GW_PORT, '/v1/heisenberg/tasks', Object.assign({ 'content-type': 'application/json' }, auth), taskBody)).body);
  A.ok(posted.task_id, 'task accepted');

  // wait for settle, then read status
  let settled = null;
  for (let i = 0; i < 30; i++) {
    const t = JSON.parse((await req('GET', GW_PORT, '/v1/heisenberg/tasks/' + posted.task_id, auth)).body);
    if (t.status !== 'running') { settled = t; break; }
    await new Promise(r => setTimeout(r, 300));
  }
  A.ok(settled && settled.status === 'completed', 'task completed against stub sidecar');
  A.eq(settled.context, { source: 'city-web', district: 'commerce', building: 'commerce_factory', slot: 'operator', agentId: 'ecom-merci' }, 'routing context preserved on the task record');

  const after = JSON.parse((await req('GET', GW_PORT, '/v1/city/status', auth)).body);
  A.eq(after.activeTasks.length, 1, 'settled task visible in city status activity');
  const at = after.activeTasks[0];
  A.eq(at.status, 'completed', 'activity carries settled status');
  A.eq(at.context.building, 'commerce_factory', 'activity carries routing for map placement');
  A.ok(at.receiptId, 'activity carries receipt id');

  // THE DISH RIDES THE RUN BODY: the gateway must declare the station's placed dish so the
  // sidecar's interactive office grants web_search/web_fetch (read-scope) to city runs.
  A.ok(runBody, 'sidecar saw the run body');
  A.eq(runBody.placed, ['dish'], 'city runs carry the placed dish (web read capability)');

  child.kill(); sidecar.close();
  A.report();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
