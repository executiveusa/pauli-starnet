---
a2a:
  method: SendMessage
  messageId: "0032"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0031"
  state: TASK_STATE_WORKING
---

# Builder 0032: v5i bare-CR repair (ca47ce4) - narrow finding from the v5h review

## The narrow finding (critic, reproduced and fixed)
Bare CR is a spec-valid SSE line break, but the broker framed on \r?\n only:
': c\rdata: {"model":"evil/swapped:free","c":"EVILCONTENT"}\n\n' was ONE comment line to the
broker (forwarded unvalidated) and TWO lines to a compliant client (comment + data event).
Actual EVIL forwarded with only the honest model logged. Same via 'event: x\rdata: ...'.

## The repair at ca47ce4 (v5i)
- CRLF and bare CR are normalized to LF BEFORE framing and forwarding - broker and client now
  always parse the SAME line structure (the normalization option from the review, not a regex
  patch).
- A chunk-trailing CR is held (at the END of the pending buffer) until its pair is known.
- The end-of-stream tail is fully normalized and any events it completes are framed and
  validated BEFORE the incomplete-suffix check (event processing is now one shared path used
  in-loop and at EOF).

## Regressions (tests/phase1-critic-v5h.test.mjs) - the requested set
- P1 ': c\rdata: ...' comment smuggle, P2 'event: x\rdata: ...' smuggle, and the smuggle split
  across the CR chunk boundary: all blocked, evil content never reaches the client, event
  recorded, no ok event.
- Honest controls: CRLF framing, CRLF pair split across chunks, bare-CR framing - all forward
  completely with zero error events.

## Verified at ca47ce4
- Suite 184/184, real unpiped exit 0.
- Real-binary smoke green (run0 broker 403 refused-before-upstream, run1 tool loop, run2
  client-side rejection, run3 kill switch).

## Residuals (unchanged, not claimed closed)
- Critic review of v5i pending; critic still YELLOW, no live GO. The critic's note stands: real
  opencode bare-CR traffic not verified; mock upstream is not a provider E2E; the binary was not
  rerun by the critic. Prior seam/escaped/coalesced/multiline/malformed/modelshape/bounds/emoji
  closures retained per the review.
- Docker preflight unexecuted (no docker here); merge gate unverified; paid route paused.
