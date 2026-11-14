/* owner.mjs /command-center: session required, GET only, bearer stays server-side, unknown upstream keys dropped. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.OWNER_SECRET = 'test-owner-secret-32chars-minimum-ok';
process.env.PAULI_GATEWAY_URL = 'https://upstream.test';
process.env.PAULI_GATEWAY_TOKEN = 'SERVER-SIDE-BEARER';
const fn = (await import('../frontend/city/deploy/netlify/functions/owner.mjs')).default;
const BASE = 'https://site.test/.netlify/functions/owner';

test('owner command-center', async (t) => {
  const login = await fn(new Request(BASE + '/login', { method: 'POST', body: JSON.stringify({ secret: process.env.OWNER_SECRET }) }));
  const cookie = login.headers.get('set-cookie').split(';')[0];

  await t.test('no session -> 401 and no upstream call', async () => {
    const orig = globalThis.fetch; let called = false;
    globalThis.fetch = async () => { called = true; return new Response('{}'); };
    try { assert.equal((await fn(new Request(BASE + '/command-center'))).status, 401); assert.equal(called, false); } finally { globalThis.fetch = orig; }
  });

  await t.test('session -> allowlisted keys only, bearer server-side', async () => {
    const orig = globalThis.fetch; let seen = null;
    globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({
      generated_at: 'x', approvals: { pending: 0 }, receipts: [], cost: { has_data: false }, permissions: [], secret_internal: 'LEAK', policy_loaded: true }), { status: 200 }); };
    try {
      const r = await fn(new Request(BASE + '/command-center', { headers: { cookie } }));
      assert.equal(r.status, 200);
      const d = await r.json();
      assert.deepEqual(Object.keys(d).sort(), ['approvals', 'cost', 'generated_at', 'permissions', 'receipts']);
      assert.equal(seen.url, 'https://upstream.test/v1/command-center');
      assert.equal(seen.init.headers.authorization, 'Bearer SERVER-SIDE-BEARER');
      assert.ok(!JSON.stringify(d).includes('SERVER-SIDE-BEARER'));
    } finally { globalThis.fetch = orig; }
  });

  await t.test('POST is refused; gateway failure is a 502, not a leak', async () => {
    assert.equal((await fn(new Request(BASE + '/command-center', { method: 'POST', headers: { cookie }, body: '{}' }))).status, 404);
    const orig = globalThis.fetch;
    globalThis.fetch = async () => new Response('boom', { status: 500 });
    try { assert.equal((await fn(new Request(BASE + '/command-center', { headers: { cookie } }))).status, 502); } finally { globalThis.fetch = orig; }
  });
});
console.log('owner-command-center: OK');
