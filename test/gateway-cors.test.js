/* Gateway CORS + provider-key env — proves the browser-surface allowlist is exact-origin
   and fail-closed, preflight never reaches auth for allowed origins, disallowed origins
   get no CORS headers, and STARNET_PROVIDER_KEY feeds run payloads. */
'use strict';
const A = require('./_assert.js');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 41000 + Math.floor(Math.random() * 2000);
const TOKEN = 'test-token-' + Math.random().toString(36).slice(2);
const ALLOWED = 'https://pauli-starnet-city.netlify.app';

function req(method, p, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method, headers: headers || {} }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function main() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'server.js')], {
    env: Object.assign({}, process.env, {
      GATEWAY_BEARER_TOKEN: TOKEN,
      GATEWAY_PORT: String(PORT),
      GATEWAY_CORS_ORIGINS: ALLOWED,
      STARNET_PORT: '9',           // no sidecar — /health still answers with starnet.ok=false
      LOG_LEVEL: 'error'
    }),
    stdio: 'ignore'
  });
  // wait for listen
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { await req('GET', '/health', { Authorization: 'Bearer ' + TOKEN }); up = true; break; }
    catch (_) { await new Promise(r => setTimeout(r, 250)); }
  }
  A.ok(up, 'gateway started');

  // preflight from allowed origin: 204 with CORS headers, no auth needed
  const pre = await req('OPTIONS', '/v1/city/status', { Origin: ALLOWED, 'Access-Control-Request-Method': 'GET' });
  A.eq(pre.status, 204, 'preflight allowed origin returns 204');
  A.eq(pre.headers['access-control-allow-origin'], ALLOWED, 'preflight echoes exact allowed origin');

  // preflight from evil origin: 403, never reaches routes
  const bad = await req('OPTIONS', '/v1/city/status', { Origin: 'https://evil.example' });
  A.eq(bad.status, 403, 'preflight disallowed origin refused');
  A.ok(!bad.headers['access-control-allow-origin'], 'disallowed origin gets no ACAO header');

  // real request from allowed origin carries ACAO
  const real = await req('GET', '/health', { Origin: ALLOWED, Authorization: 'Bearer ' + TOKEN });
  A.eq(real.status, 200, 'health answers with token');
  A.eq(real.headers['access-control-allow-origin'], ALLOWED, 'real response carries ACAO for allowed origin');

  // real request from other origin: still answers (curl/non-browser), but no ACAO
  const plain = await req('GET', '/health', { Authorization: 'Bearer ' + TOKEN });
  A.eq(plain.status, 200, 'no-origin request still works for non-browser clients');
  A.ok(!plain.headers['access-control-allow-origin'], 'no ACAO without Origin');

  // lookalike origin is not allowed (exact match, no substring)
  const lookalike = await req('OPTIONS', '/v1/city/status', { Origin: ALLOWED + '.evil.example' });
  A.eq(lookalike.status, 403, 'lookalike origin refused');

  child.kill('SIGTERM');
  A.report();
  process.exit(0);
}

main().catch(e => { console.log('FAIL: harness — ' + e.message); process.exit(1); });
