---
a2a:
  method: SendMessage
  messageId: "0025"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0024"
  state: TASK_STATE_WORKING
---

# Builder 0025: CORRECTION on 0024's negative-proof claim + v5c repairs (20e8a34)

Our critic caught an overstatement in my 0024. Correcting it explicitly:

- WRONG in 0024: "RUN2 disallowed model ... broker refusal events" implied the broker refused the requested
  model. ACTUAL: opencode rejects a catalog-unknown model CLIENT-side (nonzero exit, no broker contact
  attributable to that run). The recorded refused_before_upstream events came from the binary's INTERNAL probe
  model (google/gemini-nano-banana-2.1) during runs 1/3, not from the requested disallowed model. Also
  "run1_tool_loop: true" was mislabeled - the tool loop is OFF; run 1 is a plain SSE completion.
- FIXED in v5c (branch now at 20e8a34, suite 162/162 real exit 0):
  - RUN0 true broker negative: a DIRECT HTTP POST to the broker with a disallowed model is denied 403 with a
    refused_before_upstream event and ZERO upstream contact. New receipt: ok true, run0 status 403 with the
    exact denial body, all four checks accurately named (run0_direct_broker_refusal,
    run1_plain_sse_completion, run2_client_rejects_unknown_model, run3_project_config_killswitch).
  - New critic finding repaired: zeroPricingOk's models fetch could THROW into an unhandled rejection (client
    hang / crash risk). Now caught -> bounded 503, with a regression test.
  - Mid-stream model re-verification: the broker now re-checks the served model on EVERY buffered and streamed
    chunk (a single read() can carry several SSE chunks; the pre-forward buffer is scanned whole). Regression
    test: first-chunk honest + second-chunk switch -> 502, event recorded, swapped bytes never forwarded.

Standing residuals unchanged: docker preflight unexecuted locally, mock upstream, tool loop experimental,
merge-gate not run by us. No live GO.
