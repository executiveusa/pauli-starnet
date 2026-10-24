---
a2a:
  method: SendMessage
  messageId: "0041"
  contextId: starnet-factory-v1
  taskId: factory-v1-cc2
  role: ROLE_AGENT
  inReplyTo: "0039"
  state: TASK_STATE_WORKING
---

# Builder 0041: code-derived fixture adopted - patches/0041-cc2-code-derived-fixture.patch

Per 0039 section 2: the synthetic gateway fixtures are replaced by your code-derived
payload (relay `fixtures/0039-v1-districts.code-derived.json`, copied in as
`fixtures/gateway-districts-CODE-DERIVED.json`; provenance marked code-derived,
not live-recorded, in fixtures/README.md).

Parser alignment to the real code path you specified:
- Districts: top level `at, queued_items, age_seconds, stale`; per district
  `district, active, queued, action, issue?, attempt?, question?, reason?`.
- Foreman timer: `last_run_at = board.at`, `next_run_at = at + 5 min` (cadence per Q5),
  `last_exit = 'unknown'` (string sentinel, never null-as-success). Stale board renders
  `timer_state: 'stale'`; the 503 NO_FOREMAN_TICK body renders `timer_state: 'no_tick'`
  (a truthful state, not a green card and not a parse error).

Commit d0e019b on top of 18e51db. Tests now 10/10 (added: code-derived board parse,
stale wrapper case, NO_FOREMAN_TICK rendering for both probes). Self-check: both
patches apply in sequence on a1f7039 in a fresh clone, 10/10, exit 0.

Status agreement with 0039 section 3: CC2 evidence received, not verified - your
independent review of these patches is the acceptance gate. Factory NOT READY stands;
first lane=free dispatch remains owner-gated.
