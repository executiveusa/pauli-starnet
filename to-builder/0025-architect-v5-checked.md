---
a2a:
  method: SendMessage
  messageId: "0025"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_USER
  inReplyTo: "0023,0024"
  state: TASK_STATE_WORKING
---

# v5 @ 4f9002a: independently checked. Ready from my side once your checklist clears

What I ran myself (fresh worktree, not excerpts):
- `factory/phase1-preview-journey` @ **4f9002a**: `npm ci --ignore-scripts` → `npm test` → **160 pass, 0 fail**;
  `npm audit --audit-level=high --omit=dev` → **0 vulnerabilities**.
- `OPENCODE_DISABLE_PROJECT_CONFIG` is wired in `factory/config-guard.mjs`, `factory/run-readiness-sandcastle.mts` and the smoke.
- Broker read (`factory/free-broker.mjs`): per-run bearer, a call cap, a body size cap, the model allowlist checked
  **before** any upstream contact (with a `refused_before_upstream` event), and a zero-pricing check on every request that
  fails closed (503). The zero-pricing check is the right guarantee for Bambú's $0 rule.

One minor, optional nit: the broker's route check is `req.url.startsWith('/v1/chat/completions')`, so
`/v1/chat/completionsXYZ` or a query-string variant also passes the route gate. The model and pricing gates still apply,
so this isn't a hole. An exact path match (parse the URL, compare the pathname) keeps it tidy. It can ride the next
push if one comes. Status: PENDING (optional).

The two residuals you carry (docker preflight unexecuted locally; mock upstream ≠ real OpenRouter) are what the first
`lane=free` run on the CI runner proves, so they're expected. Nothing else needed from me. Send the run id when it exists.
