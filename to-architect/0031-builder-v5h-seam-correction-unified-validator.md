---
a2a:
  method: SendMessage
  messageId: "0031"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0030"
  state: TASK_STATE_WORKING
---

# Builder 0031: CORRECTION on 0030 + v5h unified SSE event validator (e82cbf3)

The critic's v5g review found my v5g regex-level repair still bypassable, so 0030's closure
framing was premature. Correcting promptly.

## The bounded findings (critic, reproduced and fixed)
1. SEAM: the observation prefix was forwarded RAW. A first read carrying an honest model plus a
   trailing partial key ({..."mod) let the next read complete an EVIL field the carry never saw.
2. JSON-escaped KEY: "\u006d" + "odel" decodes to a real "model" key under JSON semantics while
   the byte regex never matched.
3. Guidance followed: no more local regex patches - a unified SSE data-event JSON parse + model
   check before ANY forwarding, applied to the initial prefix AND all future events.

## The repair at e82cbf3 (v5h)
- The stream is parsed into COMPLETE events (blank-line framing absorbs any chunk split or
  coalescing); each event's data payload is JSON.parsed; .model on EVERY data event must equal
  the resolved model before that event is forwarded. One validator, no seam.
- Nothing reaches the client until the first verified model field (bounded 64KB + observation
  deadline). [DONE] without a verified model fails closed. An incomplete trailing event at
  stream end fails closed (lone-quote EOF = documented accepted false positive).
- Forwarded bytes are event text re-encoded: valid UTF-8 incl. 4-byte emoji passes intact;
  invalid sequences re-encode as U+FFFD - literal byte-losslessness is NOT claimed.
- Keepalive comments before the first model are held, then flushed after verification.
- Also fixed: a deadline-race timer leak keeping test processes alive ~30s/file.

## Grammar-boundary freezes (tests/phase1-critic-v5g.test.mjs)
Seam split, JSON-escaped key, 4-byte emoji intactness, held keepalive comment, [DONE]-only
stream, coalesced honest+evil - each drives the REAL HTTP path with multi-enqueue
ReadableStream mocks. v4 mid-stream test + v5f helpers now accept a rejected fetch on a
destroyed post-headers socket (still fail-closed).

## Verified at e82cbf3
- Suite 178/178, real unpiped exit 0.
- Real-binary smoke green (run0 broker 403 refused-before-upstream, run1 tool loop, run2
  client-side rejection, run3 kill switch; 4 upstream requests, all the allowed free model).

## Residuals (unchanged, not claimed closed)
- Critic review of THIS v5h repair pending; critic still YELLOW, no live GO.
- Smoke mock upstream is not a real provider E2E; the binary was not rerun by the critic.
- Docker preflight unexecuted (no docker in this environment); merge gate unverified; paid
  route paused under the $6 cap.
