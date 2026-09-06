'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitUrl(url, headers, attempts) {
  let last;
  for (let i = 0; i < (attempts || 60); i++) {
    try {
      const r = await fetch(url, { headers });
      if (r.status < 500) return r;
      last = new Error('status ' + r.status);
    } catch (e) { last = e; }
    await sleep(100);
  }
  throw last || new Error('gateway did not start');
}

async function json(url, init) {
  const r = await fetch(url, init);
  const data = await r.json();
  return { r, data };
}

(async () => {
  const fakeSidecar = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/api/health' || req.url === '/api/status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, city: { name: 'Test Station' } }));
    }
    if (req.method === 'POST' && req.url === '/api/run') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        res.write(JSON.stringify({ type: 'tool', name: 'shell.test', agentId: body.agentId }) + '\n');
        res.write(JSON.stringify({ type: 'agent', text: 'completed by ' + body.agentId }) + '\n');
        res.end(JSON.stringify({ type: 'end' }) + '\n');
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not-found' }));
  });

  const sidecarPort = await listen(fakeSidecar);
  const probe = http.createServer((req, res) => res.end('probe'));
  const gatewayPort = await listen(probe);
  await new Promise(r => probe.close(r));
  const probe2 = http.createServer((req, res) => res.end('probe'));
  const legacyPort = await listen(probe2);
  await new Promise(r => probe2.close(r));

  const token = 'workforce-test-token';
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'index.js')], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, {
      GATEWAY_BEARER_TOKEN: token,
      GATEWAY_PORT: String(gatewayPort),
      GATEWAY_LEGACY_PORT: String(legacyPort),
      GATEWAY_HOST: '127.0.0.1',
      STARNET_PORT: String(sidecarPort),
      STARNET_COMPUTE_URL: 'https://compute.example.test',
      STARNET_COMPUTE_TOKEN: 'never-emit-me',
      AGENTMAIL_API_KEY: 'agentmail-test-secret'
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  proc.stderr.on('data', c => { stderr += c.toString('utf8'); });

  try {
    const base = 'http://127.0.0.1:' + gatewayPort;
    const headers = { Authorization: 'Bearer ' + token };
    await waitUrl(base + '/v1/workforce/status', headers);

    // Workforce status is live and secret-free.
    {
      const { r, data } = await json(base + '/v1/workforce/status', { headers });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(data.product, 'starnet-sovereign-workforce');
      assert.strictEqual(data.providers.sovereign.configured, true);
      assert.ok(!JSON.stringify(data).includes('never-emit-me'));
      assert.ok(!JSON.stringify(data).includes('agentmail-test-secret'));
    }

    // Legacy gateway is still reachable through the public facade.
    {
      const { r, data } = await json(base + '/health', { headers });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(data.gateway, 'pauli-gateway');
      assert.strictEqual(data.starnet.ok, true);
    }

    // Plan path selects shell and avoids unnecessary computer allocation.
    {
      const { r, data } = await json(base + '/v1/workforce/missions/plan', {
        method: 'POST', headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ agentId: 'heisenberg', objective: 'Run the tests from the CLI' })
      });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(data.plan.executionLane, 'shell');
      assert.strictEqual(data.plan.computerRequired, false);
    }

    // Dispatch reaches the real /api/run path with the selected agent and returns evidence.
    let missionId;
    {
      const { r, data } = await json(base + '/v1/workforce/missions', {
        method: 'POST', headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ agentId: 'heisenberg', objective: 'Run the tests from the CLI' })
      });
      assert.strictEqual(r.status, 202);
      missionId = data.id;
      assert.ok(missionId.startsWith('mission-'));
    }

    let settled = null;
    for (let i = 0; i < 40; i++) {
      const { r, data } = await json(base + '/v1/workforce/missions/' + encodeURIComponent(missionId), { headers });
      assert.strictEqual(r.status, 200);
      if (data.status === 'completed' || data.status === 'failed') { settled = data; break; }
      await sleep(50);
    }
    assert.ok(settled, 'mission settles');
    assert.strictEqual(settled.status, 'completed');
    assert.strictEqual(settled.result, 'completed by heisenberg');
    assert.strictEqual(settled.evidence.verified, true);
    assert.ok(settled.evidence.eventCount >= 2);

    console.log('workforce-gateway.test.js OK — composite gateway + proxy + dispatch + evidence');
  } finally {
    proc.kill('SIGTERM');
    await Promise.race([new Promise(r => proc.once('exit', r)), sleep(3000)]);
    await new Promise(r => fakeSidecar.close(r));
  }
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
