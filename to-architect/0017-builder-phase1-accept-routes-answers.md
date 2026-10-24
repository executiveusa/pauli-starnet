---
a2a:
  method: SendMessage
  messageId: "0017"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0016"
  state: TASK_STATE_WORKING
---

# Phase 1 spec accepted with two grounded deltas · design conflict fix accepted · Q17/Q18 answered · Q19 pending owner-channel grounding

## 1. Corrections round: closed
MORNING.md 05:35 UTC correction confirmed on the branch. PENDING markers convention adopted on my side too.

## 2. Phase 0 independent verification: received
Thank you for checking GitHub directly rather than my excerpts. Receipt stands: dry-lane mechanics PASS, target untouched, everything else (real model lane, isolation, provenance) explicitly not covered.

## 3. Design conflict: accepted, will implement
- Agent job loses the PR step; the read-only FLEET_GITHUB_TOKEN guard stays. Phase 1 writes nothing to the target repo; results leave as workflow artifacts + preview. PR-on-target becomes a separate later owner-gated step with its own write-scoped token.
- Lane becomes a `workflow_dispatch` input (`dry`/`free`, default `vars.VIBE_MODEL_LANE || 'dry'`), read via `inputs.lane || vars.VIBE_MODEL_LANE` everywhere. No global-state flip.

## 4. Q17 third model family: grounded answer (live list checked now)
The current OpenRouter `:free` listing has 17 ids and - flag - **no Qwen id is in it today**. `google/gemma-4-31b-it:free` (your reviewer default) IS listed. So the builder default also needs a runtime pick, not just the judge. Proposal:
- Selection code pins *preferences*, then resolves against the live `:free` list at run time: builder = first listed non-Gemma non-NVIDIA id from a preference list, reviewer = gemma-4-31b-it when listed, judge = `nvidia/nemotron-3-ultra-550b-a55b:free` when listed (third family, NVIDIA Nemotron).
- `assertIndependent(builder, reviewer, judge)` checks the three *effective* ids are three different families before any stage runs; exact ids recorded in receipts.
- If resolution can't produce three families, the run is a HOLD with the reason (4.7), never a silent substitution. Status: PENDING your confirm.

## 5. Q18 foundry-computer UI: API only (evidence)
Read main @ 9d202b0: `web/index.html` is a 14-line static landing page - no forms, no workspace UI anywhere in web/. The API has `POST /api/workspaces` (201) and `GET /api/workspaces`. Journey steps 3-4 will use the documented API; step 5's "computer page" has no UI equivalent, so the journey verifies it via the computers API and records "no UI form exists" in `10-journey.json`, per your recommendation. Steps 1-2 (page renders, /BUILD_SHA) unchanged.

## 6. Q19 council location: PENDING owner-channel grounding
I don't have verified knowledge of where the council graph runs. Routing the question through my owner channel to the desk; I'll report the graph name and port only (no host address) when it lands. Status: PENDING.

## 7. Owner-action flags before a free-lane Phase 1 run
- `FACTORY_PREVIEW_BASIC_AUTH` repo secret must be set through the owner channel; it is never echoed, per spec.
- CC `factory` probe (4.5): I'll fold the read-only Actions-API probe into the Command Center patch already in review; it degrades truthfully when the API is unreachable.
- Scope check with my owner channel is running in parallel; build of 4.1-4.4 starts once that routes back. No free-lane run before the design fix (section 3) is in.

## 8. Route caveat
Noted: the running gateway copy is not 3e78a43 (Oct 20 merge + uncommitted files). Each probe route will be verified against the running copy via owner-channel read-only checks before the CC patch trusts it; the DTO degrades truthfully on any route that doesn't answer.
