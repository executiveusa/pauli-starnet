'use strict';
// Request-local bounded retry for the JEV shadow HTTP calls. fetch and sleep are
// stubbed: no network, no timers, no paid inference.
const assert = require('node:assert/strict');
const { postJson } = require('../sidecar/jev-http.js');

// Point the service at a fake token file and key before it loads.
process.env.JEV_GATEWAY_TOKEN_FILE = require('path').join(require('os').tmpdir(), 'jev-http-test-token-' + process.pid);
require('fs').writeFileSync(process.env.JEV_GATEWAY_TOKEN_FILE, 'test-token');
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.JEV_SHADOW_MODELS = 'm1,m2';
const svc = require('../sidecar/jev-shadow-openrouter.js');

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const customAnswers = { flag: { answer: 'yes' } };
const customQuestions = { flag: { type: 'boolean', instructions: 'Is it flagged?' } };
const orOk = (content) => res(200, { choices: [{ message: { content: JSON.stringify(content) } }], usage: { total_tokens: 1 } });

function script(...responses) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const r = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (r instanceof Error) throw r;
    return r;
  };
  const sleeps = [];
  const sleep = async (ms) => { sleeps.push(ms); };
  return { calls, sleeps, fetchImpl, sleep };
}

async function withDeps(s, fn) {
  svc.httpDeps.fetchImpl = s.fetchImpl;
  svc.httpDeps.sleep = s.sleep;
  try { return await fn(); } finally { svc.httpDeps.fetchImpl = undefined; svc.httpDeps.sleep = undefined; }
}

async function main() {
  // --- helper: retry once, bounded, only for accepted statuses ---
  let s = script(res(429, 'slow down'), res(200, { ok: true }));
  let r = await postJson('https://x.test', { body: { a: 1 }, retryDelayMs: 7, ...s });
  assert.equal(r.resp.status, 200);
  assert.equal(s.calls.length, 2);
  assert.deepEqual(s.sleeps, [7]);
  assert.deepEqual(r.parsed, { ok: true });
  assert.equal(r.attempts, 2);
  assert.notEqual(s.calls[0].init.signal, s.calls[1].init.signal, 'each attempt gets a fresh timeout signal');

  s = script(res(429, 'no'));
  r = await postJson('https://x.test', { body: {}, maxRetries: 1, ...s });
  assert.equal(r.resp.status, 429);
  assert.equal(s.calls.length, 2, 'bounded: one retry, never a loop');

  s = script(res(400, 'bad'));
  r = await postJson('https://x.test', { body: {}, ...s });
  assert.equal(s.calls.length, 1, '400 is not retried');

  s = script(res(500, 'x'), res(200, {}));
  r = await postJson('https://x.test', { body: {}, shouldRetry: (st) => st === 429, ...s });
  assert.equal(r.resp.status, 500);
  assert.equal(s.calls.length, 1, 'shouldRetry decides');

  s = script(new Error('boom'));
  await assert.rejects(postJson('https://x.test', { body: {}, ...s }), /boom/);
  assert.equal(s.calls.length, 1, 'network errors are not retried here');

  s = script(res(200, 'not json'));
  r = await postJson('https://x.test', { body: {}, ...s });
  assert.equal(r.parsed, null);

  // --- request-local state: concurrent requests each get their own retry ---
  {
    const seen = new Map();
    const fetchImpl = async (url, init) => {
      const id = JSON.parse(init.body).id;
      const n = (seen.get(id) || 0) + 1;
      seen.set(id, n);
      return n === 1 ? res(429, 'x') : res(200, { id });
    };
    const sleeps = [];
    const sleep = async (ms) => { sleeps.push(ms); };
    const [a, b] = await Promise.all([
      postJson('https://x.test', { body: { id: 'a' }, fetchImpl, sleep }),
      postJson('https://x.test', { body: { id: 'b' }, fetchImpl, sleep }),
    ]);
    assert.equal(a.resp.status, 200);
    assert.equal(b.resp.status, 200, 'second concurrent request still retries (no shared flag)');
    assert.equal(sleeps.length, 2);
  }

  // --- callModelCustom: now retries 429 (was missing) ---
  s = script(res(429, 'rl'), orOk(customAnswers));
  let out = await withDeps(s, () => svc.callModelCustom({ t: 1 }, customQuestions));
  assert.equal(out.ok, true);
  assert.equal(out.model, 'm1');
  assert.equal(s.calls.length, 2);
  assert.deepEqual(s.sleeps, [8000]);
  assert.equal(s.calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(s.calls[0].init.headers.authorization, 'Bearer test-key');
  const sent = JSON.parse(s.calls[0].init.body);
  assert.equal(sent.model, 'm1');
  assert.equal(sent.messages[0].role, 'system');

  // persistent 429 on every model: bounded (2 models x 2 attempts), clean error, no hang
  s = script(res(429, 'rl'));
  out = await withDeps(s, () => svc.callModelCustom({ t: 1 }, customQuestions));
  assert.equal(out.ok, false);
  assert.equal(s.calls.length, 4);
  assert.equal(out.error.status, 429);
  assert.equal(out.error.model, 'm2');

  // callModel keeps its 429 retry, now per request instead of via a global flag
  const cannedAnswers = {
    agent: { choice: 'hermes' }, next_action: { choice: 'inspect' }, risk: { score: 'low' },
    requires_human_approval: { answer: 'no' }, proof_satisfied: { answer: 'no' }, confidence: 0.9,
  };
  s = script(res(429, 'rl'), orOk(cannedAnswers));
  out = await withDeps(s, () => svc.callModel({ t: 1 }));
  assert.equal(out.ok, true);
  assert.equal(s.calls.length, 2);
  assert.deepEqual(s.sleeps, [8000]);

  // two concurrent callModel runs both retry (the old shared flag blocked the second)
  {
    const perCall = new Map();
    const fetchImpl = async (url, init) => {
      const key = JSON.parse(init.body).messages[1].content;
      const n = (perCall.get(key) || 0) + 1;
      perCall.set(key, n);
      return n === 1 ? res(429, 'rl') : orOk(cannedAnswers);
    };
    const results = await withDeps({ fetchImpl, sleep: async () => {} }, () =>
      Promise.all([svc.callModel({ id: 1 }), svc.callModel({ id: 2 })]));
    assert.deepEqual(results.map((x) => x.ok), [true, true]);
  }

  // gateway: 5xx and 429 retried once, then error body surfaces
  s = script(res(503, 'down'), res(503, 'down'));
  out = await withDeps(s, () => svc.callGatewayCustom({ t: 1 }, customQuestions));
  assert.equal(out.ok, false);
  assert.equal(out.error.status, 503);
  assert.equal(s.calls.length, 2);
  assert.deepEqual(s.sleeps, [3000]);
  assert.equal(s.calls[0].init.headers.authorization, 'Bearer test-token');

  s = script(res(429, 'rl'), res(200, { answers: { flag: { answer: 'yes' } }, usage: {} }));
  out = await withDeps(s, () => svc.callGatewayCustom({ t: 1 }, customQuestions));
  assert.equal(out.ok, true);
  assert.equal(s.calls.length, 2);

  require('fs').unlinkSync(process.env.JEV_GATEWAY_TOKEN_FILE);
  console.log('jev-http: PASS');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
