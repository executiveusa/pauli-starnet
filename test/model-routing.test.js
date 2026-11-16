'use strict';
// one-system 05_models: DeepSeek default, scarce subscription lane, $100/month budget (D5, D7).
const assert = require('assert');
const { route, budgetState, monthSpend, freeKeys } = require('../gateway/factory/model-routing.js');
const shipped = require('../registry/models.json');

let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const reg = JSON.parse(JSON.stringify(shipped));
reg.lanes['deepseek-default'].model = 'deepseek/verified-id';

eq(route({ registry: shipped, lane: 'deepseek-default', district: 'revenue' }).model, 'deepseek/deepseek-v4.1-flash-1017', 'the shipped default is the owner-verified DeepSeek 1017 id');
const unverified = JSON.parse(JSON.stringify(shipped)); unverified.lanes['deepseek-default'].model = 'VERIFY_ME';
eq(route({ registry: unverified, lane: 'deepseek-default', district: 'revenue' }).ok, false, 'an unverified model id is refused instead of guessed');
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
// Uncensored lane: not wired yet, so it falls back to the default and says why.
const unc = route({ registry: reg, lane: 'uncensored', district: 'creative' });
eq([unc.lane, /no verified model/.test(unc.note)], ['deepseek-default', true], 'an unwired lane uses its fallback and says so');

// Free pool.
const keys = ['groq'];
eq(route({ registry: reg, lane: null, district: 'creative', weight: 'test', keys }).model, 'qwen/qwen3.8-27b', 'test work goes to the first free provider that has a key');
eq(route({ registry: reg, lane: null, district: 'creative', weight: 'test', keys: [] }).lane, 'deepseek-default', 'with no free keys, light work stays on the default');
eq(route({ registry: reg, lane: 'free-pool', district: 'operations', keys: ['openrouter', 'groq'] }).model, 'nvidia/nemotron-3-ultra-550b-a55b:free', 'a free-pool agent uses the pool in order');
eq(route({ registry: reg, lane: null, district: 'creative', weight: 'light', private: true, keys }).free, undefined, 'private work never goes free');
eq(route({ registry: reg, lane: null, district: 'financial', weight: 'light', keys }).free, undefined, 'protected districts never go free');
eq(route({ registry: reg, lane: null, district: 'creative', spent: 85, keys }).lane, 'free-pool', 'at WARN, non-revenue work moves to free models');
eq(route({ registry: reg, lane: null, district: 'revenue', spent: 85, keys }).lane, 'deepseek-default', 'revenue work stays on the paid default');
eq(route({ registry: reg, lane: null, district: 'creative', spent: 100, keys }).lane, 'free-pool', 'at STOP, non-revenue work continues on free models instead of stopping');
eq(freeKeys(reg, { GROQ_API_KEY: 'x', FREE_POOL_PROVIDERS: 'mistral' }).sort(), ['groq', 'mistral'], 'free providers come from key names or FREE_POOL_PROVIDERS, never key values');

// The checker reads today's sources and flags a missing OpenRouter id.
const { check } = require('../scripts/models/free-pool.js');
const status = { providers: [{ provider: 'OpenRouter', status: 'Operational' }, { provider: 'Groq', status: 'Operational' }, { provider: 'Google Gemini', status: 'Operational' }, { provider: 'Mistral AI', status: 'Degraded' }] };
const c = check(shipped, status, { data: [{ id: 'other/model:free', pricing: { prompt: '0', completion: '0' } }] });
eq([c.rows[0].ok, c.rows[1].ok, c.rows[3].ok, c.ok], [false, true, false, false], 'the checker flags a gone OpenRouter id and a degraded provider');
console.log('model-routing.test.js: ' + n + ' assertions passed');
