/* sidecar/providers/route-policy.js — the Heisenberg model-route policy (opt-in).

   Fleet split the Commander approved (2026-09-10): Hermes governs/plans, Heisenberg decomposes and
   selects routes, StarNet executes. Groq free-tier openai/gpt-oss-120b is the DEFAULT $0 route;
   OpenRouter is a SECONDARY, deliberately-armed lane — never the default, never silent.

   This module is PURE: no IO, no clock beyond what the caller stamps, no secret handling. It answers
   three questions for the run host (sidecar/index.js runOnce):
     resolve()  — which provider/model does this run take, with what fallbacks and per-run $ cap?
     enabled()  — is the policy armed at all? (STARNET_ROUTE_POLICY=heisenberg-v1; absent = byte-
                  identical legacy behaviour for every desktop install)
     receipt()  — the route/model/token/cost/result record persisted on the run row.

   Env contract (read via the STARNET_/SKYNET_ prefix convention, same as the host's ENV()):
     ROUTE_POLICY=heisenberg-v1        arms the policy. Anything else = legacy routing.
     DEFAULT_FREE_MODEL                default-route model id. Default 'openai/gpt-oss-120b'.
     OPENROUTER_LANE=1                 arms the PAID secondary lane. Off by default: an OpenRouter
                                       request with the lane off is DENIED and falls back to the
                                       free route with the denial on the receipt.
     OPENROUTER_ALLOWED_MODELS=a,b,c   model allowlist for the secondary lane. EMPTY = deny every
                                       OpenRouter model (fail-closed).
     OPENROUTER_MAX_USD_PER_RUN=0.10   per-run hard $ ceiling for the secondary lane, clamped to
                                       [0.01, 2.00] so a fat-fingered env can never widen spend.

   Credential names stay in Infisical and resolve through the registry profiles' keyEnv lists
   (OPEN_ROUTER_API / GROQ_API_TOKEN included there); this module only ever sees presence booleans. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.SK = root.SK || {}; root.SK.providers = root.SK.providers || {}; root.SK.providers.routePolicy = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const POLICY_ID = 'heisenberg-route-policy/v1';
  const DEFAULT_PROVIDER = 'groq';
  const DEFAULT_MODEL = 'openai/gpt-oss-120b';       // Groq free tier — the fleet's verified $0 brain
  const SECONDARY_PROVIDER = 'openrouter';
  const LANE_CAP_DEFAULT_USD = 0.10;
  const LANE_CAP_FLOOR_USD = 0.01;
  const LANE_CAP_CEILING_USD = 2.00;

  function envOf(env, suffix) {
    env = env || {};
    const k = 'STARNET_' + suffix;
    if (Object.prototype.hasOwnProperty.call(env, k)) return env[k];
    return env['SKYNET_' + suffix];
  }
  function truthy(v) { return /^(1|true|yes|on)$/i.test(String(v || '').trim()); }
  function num(v) { const n = Number(String(v == null ? '' : v).trim()); return isFinite(n) ? n : NaN; }

  function enabled(env) {
    return String(envOf(env, 'ROUTE_POLICY') || '').trim().toLowerCase() === 'heisenberg-v1';
  }

  function laneConfig(env) {
    const rawCap = num(envOf(env, 'OPENROUTER_MAX_USD_PER_RUN'));
    const requested = isFinite(rawCap) && rawCap > 0 ? rawCap : LANE_CAP_DEFAULT_USD;
    const cap = Math.min(LANE_CAP_CEILING_USD, Math.max(LANE_CAP_FLOOR_USD, requested));
    const allowlist = String(envOf(env, 'OPENROUTER_ALLOWED_MODELS') || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    return {
      armed: truthy(envOf(env, 'OPENROUTER_LANE')),
      allowlist: allowlist,
      budgetCapUsd: cap,
      capClamped: cap !== requested
    };
  }

  function defaultRoute(env) {
    const model = String(envOf(env, 'DEFAULT_FREE_MODEL') || '').trim() || DEFAULT_MODEL;
    return { provider: DEFAULT_PROVIDER, model: model };
  }

  /* resolve({ requestedProvider, requestedModel, credentialFor }, env) -> decision
     credentialFor(providerId) -> boolean presence ONLY (the host resolves real keys later, never here).
     decision: { applied, policyId, lane, route:{provider,model}, requested:{provider,model},
                 denied, reason, budgetCapUsd, fallbackProviders: [{provider,model}] } */
  function resolve(opts, env) {
    opts = opts || {};
    if (!enabled(env)) return { applied: false, policyId: POLICY_ID };
    const credentialFor = typeof opts.credentialFor === 'function' ? opts.credentialFor : () => false;
    const requestedProvider = String(opts.requestedProvider || '').trim().toLowerCase();
    const requestedModel = String(opts.requestedModel || '').trim();
    const dft = defaultRoute(env);
    const base = {
      applied: true, policyId: POLICY_ID,
      requested: { provider: requestedProvider, model: requestedModel },
      denied: false, reason: '', budgetCapUsd: 0, fallbackProviders: []
    };

    if (requestedProvider === SECONDARY_PROVIDER) {
      const lane = laneConfig(env);
      const model = requestedModel;
      if (!lane.armed) {
        return Object.assign(base, { lane: 'default-free', route: dft, denied: true, reason: 'OPENROUTER_LANE_DISABLED' });
      }
      if (!credentialFor(SECONDARY_PROVIDER)) {
        return Object.assign(base, { lane: 'default-free', route: dft, denied: true, reason: 'OPENROUTER_UNCREDENTAILED' });
      }
      if (!model || lane.allowlist.indexOf(model) < 0) {
        return Object.assign(base, { lane: 'default-free', route: dft, denied: true, reason: 'MODEL_NOT_ALLOWLISTED' });
      }
      // Armed + credentialed + allowlisted: the secondary lane serves, the $0 route stands behind it.
      const fb = credentialFor(dft.provider) ? [{ provider: dft.provider, model: dft.model }] : [];
      return Object.assign(base, {
        lane: 'secondary-openrouter',
        route: { provider: SECONDARY_PROVIDER, model: model },
        reason: lane.capClamped ? 'LANE_CAP_CLAMPED_TO_CEILING' : 'SECONDARY_LANE',
        budgetCapUsd: lane.budgetCapUsd,
        fallbackProviders: fb
      });
    }

    if (requestedProvider) {
      // Another explicit provider choice (groq, codex, …): the caller's authority stands, policy observes.
      return Object.assign(base, {
        lane: 'explicit-passthrough',
        route: { provider: requestedProvider, model: requestedModel },
        reason: 'EXPLICIT_PROVIDER'
      });
    }

    // No explicit choice: Heisenberg's default is the verified $0 route. If the free credential is
    // missing the policy REFUSES to silently reroute onto a paid lane — applied:false hands the run
    // back to legacy resolution, and the receipt-less run is honest about being unrouted by us.
    if (!credentialFor(dft.provider)) {
      return { applied: false, policyId: POLICY_ID, denied: true, reason: 'DEFAULT_ROUTE_UNCREDENTAILED' };
    }
    return Object.assign(base, { lane: 'default-free', route: dft, reason: 'DEFAULT_FREE_ROUTE' });
  }

  /* receipt(decision, outcome) -> the route/model/token/cost/result row persisted on the run record.
     outcome: { result, tokens, usd } from the run finalizer. Never carries credentials. */
  function receipt(decision, outcome) {
    decision = decision || {};
    outcome = outcome || {};
    const route = decision.route || {};
    return {
      policy: decision.policyId || POLICY_ID,
      lane: String(decision.lane || ''),
      requestedProvider: String((decision.requested || {}).provider || ''),
      requestedModel: String((decision.requested || {}).model || '').slice(0, 120),
      provider: String(route.provider || ''),
      model: String(route.model || '').slice(0, 120),
      denied: !!decision.denied,
      reason: String(decision.reason || ''),
      budgetCapUsd: (typeof decision.budgetCapUsd === 'number' && isFinite(decision.budgetCapUsd)) ? decision.budgetCapUsd : 0,
      fallbackProviders: (Array.isArray(decision.fallbackProviders) ? decision.fallbackProviders : [])
        .map(f => ({ provider: String((f || {}).provider || ''), model: String((f || {}).model || '').slice(0, 120) })).slice(0, 4),
      tokens: (typeof outcome.tokens === 'number' && isFinite(outcome.tokens)) ? outcome.tokens : 0,
      usd: (typeof outcome.usd === 'number' && isFinite(outcome.usd)) ? outcome.usd : 0,
      result: String(outcome.result || '')
    };
  }

  return { POLICY_ID, DEFAULT_PROVIDER, DEFAULT_MODEL, SECONDARY_PROVIDER, LANE_CAP_DEFAULT_USD, LANE_CAP_CEILING_USD, enabled, laneConfig, defaultRoute, resolve, receipt, _internals: { envOf } };
});
