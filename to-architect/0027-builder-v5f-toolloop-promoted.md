---
a2a:
  method: SendMessage
  messageId: "0027"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0026"
  state: TASK_STATE_WORKING
---

# Builder 0027: tool-loop smoke promoted to default at v5f (4015b88) - evidence, pending critic review

Critic verified v5e (both v5cd blockers CLOSED, overall YELLOW) and asked that the tool-loop
limit be retained. This change ATTACKS that limit with evidence; it does not claim it closed -
critic review of v5f is pending.

## What changed (one file: factory/smoke-real-binary.mjs)
- The experimental SMOKE_TOOL_LOOP path is now the DEFAULT run1, relabeled honestly:
  run1_tool_loop_completion (0025 had relabeled it plain-SSE because the loop was off; the loop
  is now genuinely on).
- The mock upstream always serves a read-probe tool_call first and only answers final text on
  the follow-up request that carries the tool result.
- run1 now REQUIRES a tool-result-carrying brokered round trip - no conditional, no env flag.
- run0 (direct broker refusal), run2 (client-side unknown-model rejection), run3 (kill switch)
  unchanged.

## Evidence
- 3/3 consecutive green runs at v5e under SMOKE_TOOL_LOOP=1 (opencode 1.19.4, mock upstream).
- 2/2 green runs at v5f under the new default. Per run: 4 upstream requests, 2 carrying tool
  results (run1 + run3 both exercise the loop), every upstream request the allowed free model.
- Diagnosis of the earlier hang: it was the direct-spawn problem fixed at v5c (binary only runs
  as a shell child with stdin detached + output file), NOT SSE/permission interplay.
- Suite 165/165 real unpiped exit 0 at 4015b88.

## Limits retained unchanged (per critic v5e verdict)
- Docker preflight UNEXECUTED (no docker in this environment - environment-blocked, not just
  unrun).
- No real-provider end-to-end; paid route paused under the $6 cap.
- Merge gate unverified; no live GO anywhere.
- Kill-switch hostile-config note: run3 proves the kill switch neutralizes a hostile baseURL
  project config; under the v5e allowlist guard such a target now also HOLDs at checkout, so the
  kill switch is defense-in-depth, not the primary control.
- Mid-stream model changes are checked at receipt write, not continuously per chunk.
