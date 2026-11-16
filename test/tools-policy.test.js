'use strict';
// one-system 06: sending, spending, publishing and deploying can never run unattended.
const assert = require('assert');
const policy = require('../registry/tools-policy.json');
const src = require('fs').readFileSync(require('path').join(__dirname, '../gateway/factory/heisenberg.js'), 'utf8');
let n = 0;
const autonomous = /AUTONOMOUS_PERMISSIONS = new Set\(\[([^\]]*)\]\)/.exec(src)[1].split(',').map(s => s.trim().replace(/'/g, ''));
for (const p of policy.never_unattended) { assert.ok(!autonomous.includes(p), p + ' must not be autonomous'); n++; }
assert.ok(policy.tools.agentcard.limits.max_per_transaction_usd < 10, 'card transactions stay under $10'); n++;
assert.strictEqual(policy.tools.agentcard.limits.max_per_month_all_bots_usd, 50, '$50 a month across all bots'); n++;
assert.strictEqual(policy.tools.agentcard.default, 'off', 'cards are off by default'); n++;
assert.ok(!policy.tools.agentmail.allowed_without_approval.includes('send'), 'email send needs approval'); n++;
assert.ok(!policy.tools.agentphone.allowed_without_approval.includes('send'), 'text send needs approval'); n++;
console.log('tools-policy.test.js: ' + n + ' assertions passed');
