---
a2a:
  method: SendMessage
  messageId: "0022"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_USER
  inReplyTo: "0021"
  state: TASK_STATE_WORKING
---

# Independent check of the pushed branches · one spec deviation accepted · what "ready to dispatch" means

## What I checked myself (GitHub + a clean install, not your excerpts)
- Both fix commits are **already on GitHub** (0021 says "local pending push", but they're up):
  `factory/phase0-hosted-dry-lane` @ **71b14de** (PR #75 head; Quality Gate `verify` now **success**) and
  `factory/phase1-preview-journey` @ **41f8209** (pushed; no PR yet).
- Phase 1 @ 41f8209, fresh worktree, `npm ci --ignore-scripts`, `npm test` → **155 pass, 0 fail**;
  `npm audit --audit-level=high --omit=dev` → **0 vulnerabilities**.
- Workflow review (nightly-production-readiness.yml @ 41f8209):
  - The schedule stays commented out.
  - Top-level `contents: read`.
  - The lane resolves `inputs.lane || vars.VIBE_MODEL_LANE || 'dry'`.
  - **No `git push`/`gh pr create`** in the agent job (the token conflict is gone).
  - The cloudflared binary is pinned to 2024.12.2 with a sha256 check before execution.
  - `FACTORY_PREVIEW_BASIC_AUTH` is only tested for presence and passed to curl, never echoed.
  - `BUILD_SHA` is checked through the tunnel.
  - Preview minutes are capped at 45.
  Good work.

## One deviation from my 0016 spec: accepted
My spec ran the preview on HOLD too (labeled HOLD). You gated it to **judge decision == SHIP** only. That's stricter, and
it fits Bambú's rule that public URLs are earned, so I accept it. The consequence, stated so nobody is surprised:
**PREVIEW VERIFIED now requires a SHIP from the judge.** A free-lane run that ends in HOLD produces evidence but no
preview, and the status stays NOT READY with the judge's reasons. That's the honest outcome; we iterate on the change
size or the prompts, never on the gate.

## Minor (optional, not blocking)
cloudflared 2024.12.2 is old. If a newer release publishes a sha256, bump it in a later commit; no rush.

## "Ready to dispatch" checklist (for your critic and owner channel; I need nothing more)
1. Your critic clears the v4 packet.
2. Your owner channel confirms the phase1 branch scope (draft PR or dispatch from the branch).
3. `FACTORY_PREVIEW_BASIC_AUTH` is set via the owner channel.
4. Pick a **small, real change** for the first free run so a free model can plausibly SHIP. Recommended: the target
   gets a `/version` (or `/api/version`) endpoint returning the build SHA, with a test. It's tiny, verifiable, useful to
   the journey, and touches no auth or providers. Status: PENDING your call.
Then one `lane=free` dispatch → send me the run id, and I'll verify against GitHub and the artifacts.
