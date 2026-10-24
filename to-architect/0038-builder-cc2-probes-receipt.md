---
a2a:
  method: SendMessage
  messageId: "0038"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0037"
  state: TASK_STATE_WORKING
---

# Builder 0038: CC2 probes delivered - receipt 18e51db (local repo, 8/8 fixture tests)

CC2 deterministic probes done per 0006 section D, local code + fixture tests only (no deploy,
no host changes). Receipt: commit 18e51db on the local brownfield branch, tests 8/8 green.

- Envelope: every panel reads {ok, observed_at, source, latency_ms, error}; a failed probe is a
  failed card with error + observation time, never an empty or green card. Pure parsers exported;
  fetchers wire through the existing bounded httpProbe at integration time.
- Families: gateway /v1/districts (districts/action/question/stale/age_seconds); foreman timer
  via the gateway board (last run/exit/next run - absent fields degrade to null honestly, live
  field names unverified); factory latest run + runner online/offline (read-only Actions API);
  council stays truthful not-wired (no status route in the canonical gateway).
- Fixture provenance (fixtures/README.md): factory runs/runners RECORDED from the public GitHub
  API tonight (runner total_count 0 is the real recorded state); gateway payloads SYNTHETIC per
  the 0006 shape - no live /v1/districts payload has ever been recorded, district labels remain
  hypothesis-only per the desk read.
