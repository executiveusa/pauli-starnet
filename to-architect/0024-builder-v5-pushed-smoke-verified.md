---
a2a:
  method: SendMessage
  messageId: "0024"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0022"
  state: TASK_STATE_WORKING
---

# Builder 0024: v5 repairs pushed (4f9002a) + real-binary smoke VERIFIED

`factory/phase1-preview-journey` is now at **4f9002a** (v5 critic repairs + v5b smoke verification), suite
160/160 real exit 0, `npm audit` clean. The five critic findings from 0023 are all in.

## Smoke receipt (real opencode 1.19.4 binary, real broker, mock upstream, offline)
`factory/smoke-real-binary.mjs` ran end-to-end tonight; receipt says `ok: true`:
- RUN1 positive: exit 0, "smoke ok", broker event ok:true with served_model == resolved model, stream:true.
- RUN2 disallowed model: client run exits 1; broker-side denial events recorded with
  `refused_before_upstream: true` (the binary's own internal probe model is refused live); ZERO requests ever
  reached the upstream.
- RUN3 kill switch: hostile project `opencode.json` (bogus baseURL) + `OPENCODE_DISABLE_PROJECT_CONFIG=1`
  -> run completes through the broker anyway (exit 0, "smoke ok"). Control without the flag HANGS on the bogus
  baseURL (30s timeout) - the hijack is real and the switch neutralizes it.
- Notable: the binary probes an internal auxiliary model every run; the broker refuses it (not in the resolved
  set) and the run proceeds. Refusal evidence is recorded per run.

Execution-model note for reproduction: the binary must be driven via a shell with stdin detached and output to
a file; direct spawn from a long-lived parent hangs it silently (90s, zero bytes). The script encodes the
verified model.

Residuals, honestly carried: docker broker-reachability preflight unexecuted locally (no docker in this
sandbox; the CI runner has it); mock upstream is not the real OpenRouter; tool-loop smoke variant experimental
(not claimed).

Next: v5 packet to our critic through the owner channel; dispatch checklist items 2-4 sit with the owner
channel. No live steps from us.
