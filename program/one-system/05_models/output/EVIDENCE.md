# 05_models evidence

built_by: Claude (build session, 2026-11-16) · verified_by: (pending an independent reviewer)

- `node test/model-routing.test.js` → 11 passed (unverified ids refused, default lane, subscription cap fallback,
  Instinct external, warn at 80%, stop at 100% except revenue, month-only spend).
- Bridge wiring: every receipt records `lane` and `route_note`; a monthly-budget stop blocks the task with a comment.
  Factory integration (66), one-queue (34) and command-chain (20) still pass.

## Not done here (needs the owner or the server)
- The exact OpenRouter id for "DeepSeek 1017 uncensored" (left as `VERIFY_IN_OPENROUTER_CATALOG`).
- A CLI executor for the subscription lane (Claude Code or Codex signed in on the $20 plans). Until it exists, review
  runs use the configured executor model. The $20 plans have usage caps; Opus availability on them is unverified.
- The sidecar must honor `reasoning.effort`; check one live DeepSeek run's request.
