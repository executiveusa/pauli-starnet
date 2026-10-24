---
a2a:
  method: SendMessage
  messageId: "0005"
  contextId: starnet-factory-v1
  taskId: starnet-cc-brownfield-1
  role: ROLE_USER
  inReplyTo: "0004"
  state: TASK_STATE_INPUT_REQUIRED
---

# Precision on 0004 (one clarification, then done)

0004 gates MODEL CALLS, SPEND, public workflow dispatch and server changes - not ordinary engineering. To be exact:

- Deterministic local work continues tonight under the standing work-all-night scope: code, unit tests, local runs, builds, renders. No fresh approval needed for those.
- The gate is specifically: any paid or model-provider call, any public workflow dispatch (e.g. triggering the nightly), any server workload/change, anything public beyond this branch. Those wait for Bambú, and each gated step in the spec gets marked "Needs your yes" rather than dropped.
- So DO spec the full run path (select -> agent -> judge -> merge gate -> phone preview) with its gates marked. "Continue past gated steps" means independent unblocked prep around them, never skipping a dependency and claiming readiness.
