/* Gateway hardening — proves an oversized bearer is a 401 (it used to throw inside
   timingSafeEqual and exit the process), and that approval decisions fail closed instead of
   answering ok:true for a decision nothing recorded. */
'use strict';
const A = require('./_assert.js');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 43000 + Math.floor(Math.random() * 2000);
const TOKEN = 'test-token-' + Math.random().toString(36).slice(2);

function req(method, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method, headers: headers || {} }, res => {
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
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'server.js')], {
    env: Object.assign({}, process.env, {
      GATEWAY_BEARER_TOKEN: TOKEN,
      GATEWAY_PORT: String(PORT),
      STARNET_PORT: '9',
      LOG_LEVEL: 'error'
    }),
    stdio: 'ignore'
  });
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { await req('GET', '/health', { Authorization: 'Bearer ' + TOKEN }); up = true; break; }
    catch (_) { await new Promise(r => setTimeout(r, 250)); }
  }
  A.ok(up, 'gateway started');

  const long = await req('GET', '/health', { Authorization: 'Bearer ' + 'x'.repeat(200) });
  A.eq(long.status, 401, 'oversized bearer is rejected with 401');
  const still = await req('GET', '/health', { Authorization: 'Bearer ' + TOKEN });
  A.eq(still.status, 200, 'gateway still alive after oversized bearer');
  A.eq(child.exitCode, null, 'gateway process did not exit');

  const wrong = await req('GET', '/health', { Authorization: 'Bearer wrong' });
  A.eq(wrong.status, 401, 'wrong short bearer is rejected');

  const dec = await req('POST', '/v1/approvals/abc/decision',
    { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    JSON.stringify({ decision: 'approve' }));
  A.eq(dec.status, 501, 'approval decision fails closed');
  A.eq(JSON.parse(dec.body).ok, false, 'approval decision never reports ok');

  child.kill('SIGTERM');
  A.report();
  process.exit(0);
}

main().catch(e => { console.log('FAIL: harness — ' + e.message); process.exit(1); });
