/* free-review.test.js — the free OpenRouter reviewer fails closed and never ships unseen code.
   Run: node test/free-review.test.js */
'use strict';
const A = require('./_assert.js');
const { review, batches } = require('../scripts/review/free-review.js');

const file = (name, size) => 'diff --git a/' + name + ' b/' + name + '\n' + '+x\n'.repeat(size) + '\n';
const reply = content => ({ ok: true, status: 200, text: async () => JSON.stringify({ model: 'm:free', choices: [{ message: { content } }] }) });
const env = { OPENROUTER_API_KEY: 'k', FREE_REVIEW_BATCH_CHARS: '400' };

(async () => {
  const b = batches(file('a.js', 50) + file('b.js', 50) + file('big.js', 500), 400);
  A.ok(b.batches.length === 1 && b.tooBig[0] === 'big.js', 'whole files are batched and an oversized file is set aside, not cut');

  const sent = [];
  const ship = await review({ diff: file('a.js', 80) + file('b.js', 80), sha: 'abc', env,
    fetchImpl: async (url, init) => { sent.push(JSON.parse(init.body)); return reply('{"verdict":"SHIP","summary":"ok","findings":[]}'); } });
  A.ok(ship.verdict === 'SHIP' && ship.parts === 2, 'every part reviewed SHIP makes the review SHIP');
  A.ok(sent[0].model.endsWith(':free') && sent[0].models.every(m => m.endsWith(':free')), 'the model and its fallbacks are all free models');

  let n = 0;
  const mixed = await review({ diff: file('a.js', 80) + file('b.js', 80), sha: 'abc', env,
    fetchImpl: async () => reply(n++ ? '{"verdict":"HOLD","summary":"bug","findings":["b.js: wrong"]}' : '{"verdict":"SHIP","summary":"ok","findings":[]}') });
  A.ok(mixed.verdict === 'HOLD' && mixed.findings.some(f => /b\.js: wrong/.test(f)), 'one HOLD part holds the whole review');

  const vague = await review({ diff: file('a.js', 10), sha: 'abc', env, fetchImpl: async () => reply('Looks good to me!') });
  A.eq(vague.verdict, 'HOLD', 'a reply without a JSON verdict is HOLD');

  const unseen = await review({ diff: file('a.js', 10) + file('big.js', 500), sha: 'abc', env,
    fetchImpl: async () => reply('{"verdict":"SHIP","summary":"ok","findings":[]}') });
  A.ok(unseen.verdict === 'HOLD' && unseen.findings.some(f => /big\.js.*not reviewed/.test(f)), 'a file too large to review is never shipped');

  let threw = false;
  try { await review({ diff: file('a.js', 10), sha: 'abc', env: {} }); } catch { threw = true; }
  A.ok(threw, 'no key, no review');
  A.report();
})().catch(e => { console.error(e); process.exit(1); });
