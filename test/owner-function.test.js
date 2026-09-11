/* owner.mjs — the authenticated owner-mode function. The public gw stays GET-only;
   this proves the owner boundary: no secret configured -> dark; wrong secret -> 401;
   right secret -> HMAC cookie; session-gated task proxy; no token ever leaves the server. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.OWNER_SECRET = 'test-owner-secret-32chars-minimum-ok';
process.env.PAULI_GATEWAY_URL = 'https://upstream.test';
process.env.PAULI_GATEWAY_TOKEN = 'SERVER-SIDE-BEARER';

const mod = await import('../frontend/city/deploy/netlify/functions/owner.mjs');
const fn = mod.default;
const BASE = 'https://site.test/.netlify/functions/owner';

async function login(secret) {
  return fn(new Request(BASE + '/login', { method: 'POST', body: JSON.stringify({ secret }) }));
}

test('owner mode', async (t) => {
  await t.test('wrong/missing secret -> 401, no cookie', async () => {
    const r = await login('nope');
    assert.equal(r.status, 401);
    assert.equal(r.headers.get('set-cookie'), null);
  });

  let cookie = null;
  await t.test('right secret -> session cookie (HttpOnly Secure SameSite)', async () => {
    const r = await login('test-owner-secret-32chars-minimum-ok');
    assert.equal(r.status, 200);
    cookie = r.headers.get('set-cookie');
    assert.match(cookie, /pauli_owner=\d+\.[A-Za-z0-9_-]+/);
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/);
  });

  await t.test('session check with and without cookie', async () => {
    assert.equal((await fn(new Request(BASE + '/session'))).status, 401);
    const r = await fn(new Request(BASE + '/session', { headers: { cookie: cookie.split(';')[0] } }));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { owner: true });
  });

  await t.test('forged cookie rejected', async () => {
    const forged = 'pauli_owner=' + (Date.now() + 1e6) + '.deadbeefdeadbeef';
    assert.equal((await fn(new Request(BASE + '/session', { headers: { cookie: forged } }))).status, 401);
  });

  await t.test('task proxy: session required, payload sanitized, bearer stays server-side', async () => {
    // no session -> 401
    assert.equal((await fn(new Request(BASE + '/tasks', { method: 'POST', body: '{}' }))).status, 401);
    // with session -> forwards sanitized body upstream, returns compact ack
    let seen = null;
    const orig = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      seen = { url, init, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ id: 't-123', receipt: { receipt_id: 'r-9' } }), { status: 200 });
    };
    try {
      const r = await fn(new Request(BASE + '/tasks', {
        method: 'POST', headers: { cookie: cookie.split(';')[0] },
        body: JSON.stringify({ task: '  scan the roof ', context: { district: 'intelligence', slot: 'researcher', evil: 'x', token: 'y' } })
      }));
      assert.equal(r.status, 200);
      const d = await r.json();
      assert.equal(d.state, 'accepted'); assert.equal(d.taskId, 't-123'); assert.equal(d.receipt, true);
      assert.equal(seen.url, 'https://upstream.test/v1/heisenberg/tasks');
      assert.equal(seen.init.headers.authorization, 'Bearer SERVER-SIDE-BEARER');
      assert.equal(seen.body.task, 'scan the roof');
      assert.equal(seen.body.context.source, 'city-web-owner');
      assert.deepEqual(Object.keys(seen.body.context).sort(), ['district', 'slot', 'source']);
      assert.ok(!('evil' in seen.body.context) && !('token' in seen.body.context), 'hostile context keys dropped');
    } finally { globalThis.fetch = orig; }
  });

  await t.test('verbs/routes locked', async () => {
    assert.equal((await fn(new Request(BASE + '/login'))).status, 404);
    assert.equal((await fn(new Request(BASE + '/tasks'))).status, 404);
    assert.equal((await fn(new Request(BASE + '/nope', { method: 'POST' }))).status, 404);
  });

  await t.test('no OWNER_SECRET -> everything dark (503)', async () => {
    delete process.env.OWNER_SECRET;
    assert.equal((await fn(new Request(BASE + '/session'))).status, 503);
    assert.equal((await login('anything')).status, 503);
    process.env.OWNER_SECRET = 'test-owner-secret-32chars-minimum-ok';
  });
});
console.log('owner-function: OK');
