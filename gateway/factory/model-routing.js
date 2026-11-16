'use strict';
// one-system 05_models: which model runs a piece of work, and whether the budget allows it (D5, D7).
// Pure: the model registry, the agent's lane, today's subscription use and the month's spend come in as arguments.

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

// The route for one run. `lane` comes from the agent's roster entry (model_lane); `subscriptionUsedToday` counts
// runs already made on the scarce lane today.
function route({ registry, lane, district, spent = 0, subscriptionUsedToday = 0 }) {
  const budget = budgetState(registry, spent);
  if (budget.state === 'STOP' && !(registry.revenue_districts || []).includes(district)) {
    return { ok: false, reason: 'monthly budget of $' + budget.cap + ' reached; only revenue work continues', budget };
  }
  let name = lane && registry.lanes[lane] ? lane : 'deepseek-default';
  let note = lane && !registry.lanes[lane] ? 'unknown lane "' + lane + '", using deepseek-default' : null;
  let l = registry.lanes[name];
  if (name === 'subscription-review' && subscriptionUsedToday >= (Number(l.daily_cap) || 0)) {
    note = 'subscription lane used ' + subscriptionUsedToday + ' times today (cap ' + l.daily_cap + '); using ' + l.fallback_lane;
    name = l.fallback_lane; l = registry.lanes[name];
  }
  if (l.provider === 'external') return { ok: false, reason: 'this agent runs outside StarNet (' + name + ')', budget };
  if (!l.model || VERIFY.test(l.model)) return { ok: false, reason: 'lane ' + name + ' has no verified model id in registry/models.json', budget };
  return { ok: true, lane: name, provider: l.provider, model: l.model, reasoning: l.reasoning || null, note, budget };
}

module.exports = { monthSpend, budgetState, route };
