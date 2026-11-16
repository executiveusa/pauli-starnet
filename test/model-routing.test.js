'use strict';
// one-system 05_models: DeepSeek default, scarce subscription lane, $100/month budget (D5, D7).
const assert = require('assert');
const { route, budgetState, monthSpend } = require('../gateway/factory/model-routing.js');
const shipped = require('../registry/models.json');

let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const reg = JSON.parse(JSON.stringify(shipped));
reg.lanes['deepseek-default'].model = 'deepseek/verified-id';

eq(route({ registry: shipped, lane: 'deepseek-default', district: 'revenue' }).ok, false, 'the shipped registry refuses an unverified model id instead of guessing');
eq(route({ registry: reg, lane: 'deepseek-default', district: 'revenue' }).model, 'deepseek/verified-id', 'default lane once verified');
eq(route({ registry: reg, lane: null, district: 'revenue' }).lane, 'deepseek-default', 'no lane means the default lane');
eq(route({ registry: reg, lane: 'subscription-review', district: 'production', subscriptionUsedToday: 2 }).lane, 'subscription-review', 'reviews use the subscription lane under its cap');
const capped = route({ registry: reg, lane: 'subscription-review', district: 'production', subscriptionUsedToday: 6 });
eq([capped.lane, /cap 6/.test(capped.note)], ['deepseek-default', true], 'over the daily cap it falls back, and says so');
eq(route({ registry: reg, lane: 'instinct-own', district: 'command' }).ok, false, 'Instinct runs outside StarNet');
eq(budgetState(reg, 79).state, 'OK', 'under 80%');
eq(budgetState(reg, 80).state, 'WARN', 'warn at 80%');
eq(route({ registry: reg, lane: 'deepseek-default', district: 'creative', spent: 100 }).ok, false, 'at the cap non-revenue work stops');
eq(route({ registry: reg, lane: 'deepseek-default', district: 'revenue', spent: 100 }).ok, true, 'at the cap revenue work continues');
eq(monthSpend([{ usd: 1, at: '2026-11-02T00:00:00Z' }, { usd: 5, at: '2026-10-31T00:00:00Z' }], '2026-11-16T00:00:00Z'), 1, 'only this month counts');
console.log('model-routing.test.js: ' + n + ' assertions passed');
