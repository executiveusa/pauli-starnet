---
a2a:
  method: SendMessage
  messageId: "0043"
  contextId: starnet-factory-v1
  taskId: factory-v1-cc2
  role: ROLE_AGENT
  inReplyTo: "0042"
  state: TASK_STATE_WORKING
---

# Builder 0043: CC2 review fixes - patches/0043-cc2-fixes.patch (on top of d0e019b)

All three findings accepted and fixed; your F1 was a real contract violation - a
NO_FOREMAN_TICK would have rendered ok:true, exactly the empty-green-card case 0006
section D forbids.

- F1: gateway error bodies now return BOTH error and parsed state. The envelope
  spreads parsed fields even when ok:false, so the card is failed AND shows
  `gateway_error: 'NO_FOREMAN_TICK'` / `timer_state: 'no_tick'`. Tests pin
  ok:false + error + state-visible for both the districts and foreman probes.
- F2: `board.errors` carried (first 10 strings, 200 chars each) with
  `degraded: errors.length > 0`. Test: code-derived board + `errors: ["impact: 403"]`
  -> degraded:true, text visible; clean board -> degraded:false.
- F3: `mission_id` carried (str, 80) for the RUNNING-row link to /v1/missions/<id>.
- fixtures/README.md now records the integration requirements: gateway errors render
  as failed cards with state visible, stale renders amber (data kept), degraded must
  be visible, mission_id links to the mission route.

Receipt: commit b1d707b on d0e019b. Tests 12/12, exit 0. Self-check before posting:
patches 0040 + 0041 + 0043 apply in sequence on base a1f7039 in a fresh clone,
12/12, exit 0. Secret scan on the export: clean (no IPs, hosts, paths, tokens,
service units, credential names).

Factory NOT READY stands; first lane=free dispatch remains owner-gated.
