/* node test/route-policy.test.js - Heisenberg route policy: default $0 route, gated OpenRouter
   secondary lane, allowlist, per-run cap clamp, fallback construction, receipt shape. */
'use strict';
const A = require('./_assert.js');
const policy = require('../sidecar/providers/route-policy.js');
const registry = require('../sidecar/providers/registry.js');

module.exports = (async () => {
  const ENV_ON = { STARNET_ROUTE_POLICY: 'heisenberg-v1' };
  const credAll = () => true;
  const credGroqOnly = pid => pid === 'groq';
  const credNone = () => false;

  // --- arming ---
  A.ok(!policy.enabled({}), 'policy is inert with no env');
  A.ok(!policy.enabled({ STARNET_ROUTE_POLICY: 'off' }), 'policy is inert for other values');
  A.ok(policy.enabled(ENV_ON), 'STARNET_ROUTE_POLICY=heisenberg-v1 arms the policy');
  A.ok(policy.enabled({ SKYNET_ROUTE_POLICY: 'heisenberg-v1' }), 'legacy SKYNET_ prefix also arms it');

  // --- default route ---
  let d = policy.resolve({ requestedProvider: '', requestedModel: '', credentialFor: credAll }, ENV_ON);
  A.ok(d.applied, 'default: applied');
  A.eq(d.lane, 'default-free', 'default: lane');
  A.eq(d.route, { provider: 'groq', model: 'openai/gpt-oss-120b' }, 'default: Groq gpt-oss-120b is the $0 route');
  A.eq(d.budgetCapUsd, 0, 'default: no paid cap on the free route');
  A.eq(d.fallbackProviders, [], 'default: no fallbacks needed');
  A.eq(d.denied, false, 'default: not denied');

  d = policy.resolve({ requestedProvider: '', requestedModel: '', credentialFor: credAll },
    Object.assign({ STARNET_DEFAULT_FREE_MODEL: 'openai/gpt-oss-20b' }, ENV_ON));
  A.eq(d.route.model, 'openai/gpt-oss-20b', 'default free model is env-overridable');

  d = policy.resolve({ requestedProvider: '', requestedModel: '', credentialFor: credNone }, ENV_ON);
  A.ok(!d.applied && d.denied && d.reason === 'DEFAULT_ROUTE_UNCREDENTAILED',
    'no Groq credential: policy refuses to silently reroute (never onto a paid lane)');

  // --- OpenRouter lane gating (fail-closed) ---
  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'deepseek/deepseek-chat-v3.1', credentialFor: credAll }, ENV_ON);
  A.ok(d.applied && d.denied && d.reason === 'OPENROUTER_LANE_DISABLED', 'lane unarmed: denied');
  A.eq(d.route, { provider: 'groq', model: 'openai/gpt-oss-120b' }, 'lane unarmed: falls back to the $0 route');

  const ENV_LANE = Object.assign({}, ENV_ON, { STARNET_OPENROUTER_LANE: '1' });
  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'deepseek/deepseek-chat-v3.1', credentialFor: credAll }, ENV_LANE);
  A.ok(d.denied && d.reason === 'MODEL_NOT_ALLOWLISTED', 'empty allowlist denies every OpenRouter model');

  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'deepseek/deepseek-chat-v3.1', credentialFor: credGroqOnly }, ENV_LANE);
  A.ok(d.denied && d.reason === 'OPENROUTER_UNCREDENTAILED', 'no OpenRouter credential: denied, never a blind call');

  const ENV_ARMED = Object.assign({}, ENV_LANE, { STARNET_OPENROUTER_ALLOWED_MODELS: 'deepseek/deepseek-chat-v3.1, openai/gpt-5-mini' });
  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'deepseek/deepseek-chat-v3.1', credentialFor: credAll }, ENV_ARMED);
  A.ok(d.applied && !d.denied, 'armed+allowlisted+credentialed: serves');
  A.eq(d.lane, 'secondary-openrouter', 'lane is secondary-openrouter');
  A.eq(d.route, { provider: 'openrouter', model: 'deepseek/deepseek-chat-v3.1' }, 'route honors the allowlisted model');
  A.eq(d.budgetCapUsd, 0.10, 'per-run cap defaults to $0.10');
  A.eq(d.fallbackProviders, [{ provider: 'groq', model: 'openai/gpt-oss-120b' }], 'the $0 route stands behind the secondary lane');

  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'anthropic/claude-opus-4.1', credentialFor: credAll }, ENV_ARMED);
  A.ok(d.denied && d.reason === 'MODEL_NOT_ALLOWLISTED', 'non-allowlisted model denied');

  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'openai/gpt-5-mini', credentialFor: credAll },
    Object.assign({}, ENV_ARMED, { STARNET_OPENROUTER_MAX_USD_PER_RUN: '50' }));
  A.eq(d.budgetCapUsd, 2.00, 'lane cap clamps to the $2.00 ceiling');
  A.eq(d.reason, 'LANE_CAP_CLAMPED_TO_CEILING', 'clamp is recorded on the decision');

  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'openai/gpt-5-mini', credentialFor: credAll },
    Object.assign({}, ENV_ARMED, { STARNET_OPENROUTER_MAX_USD_PER_RUN: '0.25' }));
  A.eq(d.budgetCapUsd, 0.25, 'a sane lane cap passes through');

  // --- explicit passthrough of other providers ---
  d = policy.resolve({ requestedProvider: 'groq', requestedModel: 'llama-3.3-70b-versatile', credentialFor: credAll }, ENV_ON);
  A.ok(d.applied && !d.denied && d.lane === 'explicit-passthrough', 'explicit non-OpenRouter provider passes through');
  A.eq(d.route, { provider: 'groq', model: 'llama-3.3-70b-versatile' }, 'passthrough honors the caller model');

  // --- policy off: byte-identical legacy ---
  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'x', credentialFor: credAll }, {});
  A.ok(!d.applied, 'policy off: nothing applied, legacy resolution owns the run');

  // --- receipt shape: route/model/token/cost/result ---
  d = policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'deepseek/deepseek-chat-v3.1', credentialFor: credAll }, ENV_ARMED);
  const r = policy.receipt(d, { result: 'done', tokens: 4321, usd: 0.0042 });
  A.eq(r.policy, 'heisenberg-route-policy/v1', 'receipt: policy id');
  A.eq(r.lane, 'secondary-openrouter', 'receipt: lane');
  A.eq(r.provider, 'openrouter', 'receipt: provider');
  A.eq(r.model, 'deepseek/deepseek-chat-v3.1', 'receipt: model');
  A.eq(r.tokens, 4321, 'receipt: tokens');
  A.eq(r.usd, 0.0042, 'receipt: cost');
  A.eq(r.result, 'done', 'receipt: result');
  A.eq(r.budgetCapUsd, 0.10, 'receipt: cap');
  A.eq(r.fallbackProviders, [{ provider: 'groq', model: 'openai/gpt-oss-120b' }], 'receipt: fallbacks');
  A.ok(!/key|token|secret/i.test(JSON.stringify(r).replace(/tokens/i, '')), 'receipt carries no credential fields');

  const rDenied = policy.receipt(
    policy.resolve({ requestedProvider: 'openrouter', requestedModel: 'x/y', credentialFor: credAll }, ENV_ON),
    { result: 'done', tokens: 100, usd: 0 });
  A.ok(rDenied.denied && rDenied.reason === 'OPENROUTER_LANE_DISABLED' && rDenied.provider === 'groq',
    'denied receipt shows the free route that actually served');

  // --- registry: verified fleet secret names resolve ---
  const orProfile = registry.getProviderProfile('openrouter');
  A.ok(orProfile.keyEnv.indexOf('OPEN_ROUTER_API') >= 0, 'openrouter keyEnv includes the Infisical-verified OPEN_ROUTER_API');
  const groqProfile = registry.getProviderProfile('groq');
  A.eq(groqProfile.keyEnv[0], 'GROQ_API_TOKEN', 'groq keyEnv prefers the Infisical-verified GROQ_API_TOKEN');
  A.ok(groqProfile.keyEnv.indexOf('GROQ_API_KEY') >= 0, 'groq keyEnv keeps GROQ_API_KEY as fallback');

  // --- runstore: route receipt persists with a bounded shape ---
  const { makeRunStore } = require('../sidecar/runstore.js');
  const rows = [];
  const store = makeRunStore({ io: { append: e => rows.push(e) }, clock: { now: () => 1000 } });
  store.record({ runId: 'r1', agentId: 'heisenberg', reason: 'done', route: r });
  A.eq(rows[0].route.provider, 'openrouter', 'runstore persists the route receipt');
  A.eq(rows[0].route.usd, 0.0042, 'runstore receipt keeps cost');
  store.record({ runId: 'r2', agentId: 'heisenberg', reason: 'done' });
  A.eq(rows[1].route, null, 'legacy run rows carry null route');

  A.report('route-policy.test');
})();
