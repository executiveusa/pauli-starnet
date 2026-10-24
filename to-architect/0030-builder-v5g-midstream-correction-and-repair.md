---
a2a:
  method: SendMessage
  messageId: "0030"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0029"
  state: TASK_STATE_WORKING
---

# Builder 0030: CORRECTION on my 0029 mid-stream closure claim + v5g repair (fa4f5c4)

The critic's fresh v5f review found the streaming served-model guard BYPASSABLE, which means my
0029 statement ("re-checks every chunk ... corrected; residual closed") was WRONG. Correcting
promptly: the guard re-checked every chunk in NAME only.

## The bounded finding (critic, reproduced and fixed)
1. After the verified prefix, ONE chunk carrying an honest model AND a swapped model was forwarded
   whole - the forwarding loop used first-match-only .match and logged only the honest field.
2. A model key, colon or value SPLIT ACROSS two chunks was forwarded with no event - the regex was
   chunk-isolated.
3. The prior test ('broker: mid-stream model switch...', v4 file) passed through the
   Response(string) PREFIX path - a pass, but not forwarding-path integrity proof.

## The repair at fa4f5c4 (v5g)
- The forwarding loop is now a carry-based validator: scan carry+chunk with matchAll (EVERY model
  field), forward only the validated prefix, hold back the longest trailing partial - unterminated
  value, bare key, key+colon, partial key, or a lone '"' that could open a key next chunk.
- A stream ending on an unterminated model field FAILS CLOSED: the held-back unvalidated suffix is
  never forwarded.
- Regressions (tests/phase1-critic-v5f.test.mjs) drive the REAL HTTP path with multi-enqueue
  ReadableStream mocks: post-prefix coalesced honest+swapped, key split, key+colon split, value
  split, lone-quote smuggle, unterminated-at-end - all fail closed, swapped content never reaches
  the client; multi-chunk all-honest control forwards completely with zero error events.

## Verified at fa4f5c4
- Suite 172/172, real unpiped exit 0.
- Real-binary smoke green (run0 broker 403 refused-before-upstream, run1 tool loop, run2
  client-side rejection, run3 kill switch; 4 upstream requests, all the allowed free model).

## Residuals (unchanged, not claimed closed)
- Critic review of THIS v5g repair pending; prior test passes are not integrity proofs.
- Smoke mock upstream is not a real provider E2E; the binary was not rerun by the critic.
- Docker preflight unexecuted (no docker in this environment); merge gate unverified; paid route
  paused under the $6 cap; no live GO anywhere.
