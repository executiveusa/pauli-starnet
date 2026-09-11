# Heisenberg model routes — Groq default, OpenRouter secondary

**Status:** implemented on branch `heisenberg/openrouter-secondary-lane` (2026-09-10), awaiting Commander review. **Not active in production.**

Fleet split: Hermes governs and plans; Heisenberg decomposes and selects routes; StarNet executes. This
document is the env contract for the model-route half of that split. The code lives in
`sidecar/providers/route-policy.js` (pure), wired into the run host's provider/model resolution in
`sidecar/index.js`, with receipts persisted on the run row (`sidecar/runstore.js`).

## Routes

| lane | provider | model | cost | when it serves |
|---|---|---|---|---|
| `default-free` | Groq | `openai/gpt-oss-120b` | $0 free tier | every run with no explicit provider choice |
| `secondary-openrouter` | OpenRouter | allowlisted models only | paid, per-token, hard-capped per run | only when explicitly requested AND armed AND allowlisted |
| `explicit-passthrough` | any other | caller's | caller's authority | an explicit non-OpenRouter provider choice |

The OpenRouter lane is **fail-closed**: lane unarmed, no credential, or model not on the allowlist means
the request is denied, the run falls back to the free route, and the denial rides the receipt.

## Env contract

| var (STARNET_ or SKYNET_ prefix) | default | meaning |
|---|---|---|
| `ROUTE_POLICY` | unset | `heisenberg-v1` arms the policy. Unset = legacy routing, byte-identical. |
| `DEFAULT_FREE_MODEL` | `openai/gpt-oss-120b` | default-route model id |
| `OPENROUTER_LANE` | off | `1` arms the paid secondary lane |
| `OPENROUTER_ALLOWED_MODELS` | empty (deny all) | comma-separated model allowlist |
| `OPENROUTER_MAX_USD_PER_RUN` | `0.10` | per-run hard $ ceiling, clamped to [$0.01, $2.00] |

## Credentials (Infisical names, references only)

Secrets stay in Infisical HERMES and reach services via env; they are never committed or printed.

| secret name | provider | status (verified 2026-09-10) |
|---|---|---|
| `GROQ_API_TOKEN` | Groq | valid — resolves first in the groq profile `keyEnv` |
| `GROQ_API_KEY` | Groq | expired — kept as fallback name only |
| `OPEN_ROUTER_API` | OpenRouter | live, $45.93 remaining of $50 limit, expires 2026-10-09 — added to the openrouter profile `keyEnv` |

## Receipts

Every policy-routed run persists a `route` receipt on its run record: policy id, lane, requested
provider/model, serving provider/model, denial + reason, per-run budget cap, fallback providers,
tokens, USD, and result. No credential material ever appears on a receipt.

## Rollback

The policy is opt-in by env. Rollback = unset `STARNET_ROUTE_POLICY` (or revert the branch). With the
env absent the run host's behavior is byte-identical to before this change.

## Free-route eval

`node scripts/free-route-eval.mjs` runs one consistent workflow suite (mission decomposition, code
patch, lane classification, receipt compression) across the genuinely free server-capable routes and
reports quality, speed, reliability, and token usage into `.dogfood/free-route-eval/`. It cannot name
any paid provider id. OpenCode Zen's free models are client-only (HTTP 400 MissingSessionID
server-side, verified 2026-09-10) and are reported as client-lane rows, never server routes.

## Free-route candidate audit (2026-09-10)

Input lead list: https://github.com/open-free-llm-api/awesome-freellm-apis (Bambú's link). Every entry
verified against the provider's CURRENT official source before any test. Verdicts:

| candidate | verdict | evidence (official source) |
|---|---|---|
| Groq free tier | INCLUDED — benchmarked | key `GROQ_API_TOKEN` live; free tier, no card (https://console.groq.com/docs/models) |
| Z.AI GLM-4.5-Flash / GLM-4.7-Flash | EXCLUDED — stored key fails auth | officially "Free" (https://docs.z.ai/guides/overview/pricing) but the Infisical `GLM_API_KEY` returns HTTP 401 on both api.z.ai and open.bigmodel.cn (probed 2026-09-10). Re-mint the key to unlock this lane. Privacy note: z.ai's policy allows training on inputs (https://docs.z.ai/legal-agreement/privacy-policy.md) — no client-confidential payloads. |
| DeepSeek | EXCLUDED — paid only | per-token pricing, no free tier (https://api-docs.deepseek.com/quick_start/pricing) |
| Kimi/Moonshot | EXCLUDED — funding required | "you need to recharge at least $1 to start using" (https://platform.kimi.ai/docs/pricing/limits) |
| Together AI | EXCLUDED — funding required | "does not currently offer free trials… minimum $5 credit purchase" (https://docs.together.ai/docs/billing-credits) |
| Venice | EXCLUDED — paid only | per-token USD pricing (https://docs.venice.ai/overview/pricing) |
| GitHub Models | EXCLUDED — service retired | "GitHub Models has been retired… As of July 30, 2026" (https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models) — the lead list is stale here |
| OpenRouter `:free` models | EXCLUDED — spillover risk | the fleet's OpenRouter key is funded ($45.93 remaining); that endpoint CAN draw the balance, so no OpenRouter route runs in free benchmarks |
| OpenCode Zen free models | EXCLUDED from server — client-only | HTTP 400 MissingSessionID server-side (verified 2026-09-10); free tier works only inside the OpenCode client |
| Cohere / Mistral / Cerebras / Cloudflare / NVIDIA NIM / Gemini / others on the list | EXCLUDED — no credential safely available | no key exists in Infisical/vault today; adding one needs the Commander to mint it. Notable future lead: Google AI Studio Gemini free key (no card) — ask him. |
