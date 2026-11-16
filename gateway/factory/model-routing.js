'use strict';
// one-system 05_models: which model runs a piece of work, and whether the budget allows it (D5, D7).
// Pure: the model registry, the agent's lane, the mission's weight, which free providers have keys, today's
// subscription use and the month's spend all come in as arguments.

const VERIFY = /^VERIFY/;

// Month-to-date spend in USD from bridge receipts (each has `usd` and `at`).
function monthSpend(receipts, now) {
  const month = new Date(now).toISOString().slice(0, 7);
  return (receipts || []).filter(r => String(r.at || '').slice(0, 7) === month).reduce((s, r) => s + (Number(r.usd) || 0), 0);
}

// Budget state: OK, WARN (at or above warn_at), or STOP (at or above the cap; only revenue work continues).
function budgetState(registry, spent) {
  const cap = Number(registry.monthly_budget_usd) || 0;
  if (!cap) return { state: 'OK', spent, cap: null };
  if (spent >= cap) return { state: 'STOP', spent, cap };
  if (spent >= cap * (Number(registry.warn_at) || 0.8)) return { state: 'WARN', spent, cap };
  return { state: 'OK', spent, cap };
}

// Which free-pool providers have a credential (names only; values are never read here). The sidecar holds the keys;
// when the factory runs in another process, FREE_POOL_PROVIDERS="openrouter,groq" names them instead.
function freeKeys(registry, env) {
  const out = String((env && env.FREE_POOL_PROVIDERS) || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const c of ((registry && registry.free_pool && registry.free_pool.candidates) || [])) {
    if ((c.key_env || []).some(k => env && env[k])) out.push(c.provider);
  }
  return [...new Set(out)];
}

// The first free model whose provider has a key, or null. Private work and protected districts never go free:
// free tiers may log prompts or train on them.
function freePick(registry, { district, private: priv, keys }) {
  const pool = registry.free_pool;
  if (!pool || priv || (pool.never_for_districts || []).includes(district)) return null;
  const have = new Set(keys || []);
  return (pool.candidates || []).find(c => have.has(c.provider) && c.model && !VERIFY.test(c.model)) || null;
}

function freeRoute(c, why, budget) {
  return { ok: true, lane: 'free-pool', provider: c.provider, model: c.model, reasoning: null, free: true, note: why + ': ' + c.provider + ' ' + c.model, budget };
}

// The route for one run. `lane` comes from the agent's roster entry (model_lane); `weight` from the mission spec
// ('light' | 'test' | 'normal'); `keys` lists free-pool providers that have a credential.
// When work goes to the free pool:
//   - the agent's lane is free-pool, or the mission is light or test work
//   - the budget is at WARN or STOP and the work is not revenue work
// Revenue work and private work stay on paid lanes.
function route({ registry, lane, district, weight = 'normal', private: priv = false, keys = [], spent = 0, subscriptionUsedToday = 0 }) {
  const budget = budgetState(registry, spent);
  const revenue = (registry.revenue_districts || []).includes(district);
  const free = freePick(registry, { district, private: priv, keys });

  if (lane === 'free-pool' || weight === 'light' || weight === 'test') {
    if (free) return freeRoute(free, lane === 'free-pool' ? 'free-pool agent' : weight + ' work', budget);
  }
  if (budget.state === 'STOP' && !revenue) {
    if (free) return freeRoute(free, 'monthly budget of $' + budget.cap + ' reached, non-revenue work moved to free models', budget);
    return { ok: false, reason: 'monthly budget of $' + budget.cap + ' reached; only revenue work continues', budget };
  }
  if (budget.state === 'WARN' && !revenue && free) {
    return freeRoute(free, 'budget at ' + Math.round(budget.spent / budget.cap * 100) + '%, non-revenue work moved to free models', budget);
  }

  let name = lane && registry.lanes[lane] ? lane : 'deepseek-default';
  let note = lane && lane !== 'free-pool' && !registry.lanes[lane] ? 'unknown lane "' + lane + '", using deepseek-default' : null;
  let l = registry.lanes[name];
  if (name === 'subscription-review' && subscriptionUsedToday >= (Number(l.daily_cap) || 0)) {
    note = 'subscription lane used ' + subscriptionUsedToday + ' times today (cap ' + l.daily_cap + '); using ' + l.fallback_lane;
    name = l.fallback_lane; l = registry.lanes[name];
  }
  // A lane not wired yet (for example the uncensored lane before Venice or Hermes is connected) uses its fallback.
  if ((!l.model || VERIFY.test(l.model)) && l.fallback_lane && registry.lanes[l.fallback_lane]) {
    note = 'lane ' + name + ' has no verified model yet; using ' + l.fallback_lane;
    name = l.fallback_lane; l = registry.lanes[name];
  }
  if (l.provider === 'external') return { ok: false, reason: 'this agent runs outside StarNet (' + name + ')', budget };
  if (!l.model || VERIFY.test(l.model)) return { ok: false, reason: 'lane ' + name + ' has no verified model id in registry/models.json', budget };
  return { ok: true, lane: name, provider: l.provider, model: l.model, reasoning: l.reasoning || null, note, budget };
}

module.exports = { monthSpend, budgetState, freeKeys, route };
