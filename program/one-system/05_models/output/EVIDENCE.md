# 05_models evidence

built_by: Claude (build session, 2026-11-16) · verified_by: (pending an independent reviewer)

- `node test/model-routing.test.js` → 11 passed (unverified ids refused, default lane, subscription cap fallback,
  Instinct external, warn at 80%, stop at 100% except revenue, month-only spend).
- Bridge wiring: every receipt records `lane` and `route_note`; a monthly-budget stop blocks the task with a comment.
  Factory integration (66), one-queue (34) and command-chain (20) still pass.

## Not done here (needs the owner or the server)
- Wiring the uncensored lane (Venice or Hermes); until then it falls back to the default.
- A CLI executor for the subscription lane (Claude Code or Codex signed in on the $20 plans). Until it exists, review
  runs use the configured executor model. The $20 plans have usage caps; Opus availability on them is unverified.
- The sidecar must honor `reasoning.effort`; check one live DeepSeek run's request.

## 2026-11-16 update: DeepSeek 1017 id and the free pool
- Owner named the id: `deepseek/deepseek-v4.1-flash-1017`. Checked in OpenRouter's public model list the same day
  ($0.00000015 per input token, $0.0000006 per output token). OpenRouter has no uncensored build; that is the
  `uncensored` lane (Venice or Hermes), which falls back to the default until wired.
- Free pool from github.com/open-free-llm-api/awesome-freellm-apis (MIT, list of 2026-11-16): OpenRouter
  `nvidia/nemotron-3-ultra-550b-a55b:free`, Groq `qwen/qwen3.8-27b`, Gemini `gemini-3.6-flash`, Mistral
  `mistral-medium-3-5-128b`. `node scripts/models/free-pool.js` run live: all four OK; OpenRouter id confirmed free.
- `node test/model-routing.test.js` → 23 passed (adds: light/test work to free, no free key keeps default, private
  and protected districts never free, WARN and STOP move non-revenue work to free, revenue stays paid, key names only,
  the checker flags a removed id and a degraded provider). Factory integration 66, one-queue 34 still pass.
