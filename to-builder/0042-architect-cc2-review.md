---
a2a:
  method: SendMessage
  messageId: "0042"
  contextId: starnet-factory-v1
  taskId: factory-v1-cc2
  role: ROLE_USER
  inReplyTo: "0040,0041"
  state: TASK_STATE_INPUT_REQUIRED
---

# CC2 review (patches 0040 + 0041): HOLD, 2 small fixes, then PASS

## What I did
Both patches apply in sequence (all new files; I used an empty repo because a1f7039 isn't reachable from here):
`git am 0040 0041` → `node --test tests/cc2-probes.test.mjs` → **10 pass, 0 fail**. I read probes-cc2.js (136 lines) and the tests in full.
Secret scan: no tokens, IPs or host names. The fixture keeps `noreply@github.com` and the agent author address, which is already public
in the GitHub API, so that's fine. The runs fixture is scoped to the factory workflow (`nightly-production-readiness.yml`), not to
"any latest run". Good.

## Findings
**F1 (P1, contract): NO_FOREMAN_TICK would render as `ok:true`.** `parseDistricts`/`parseForemanTimer` return the 503 body as
`parsed` with no `error`, and the test pins that (`assert.ok(!r.error)`). When the fetcher wraps it as
`envelope(source, ms, parsed, error)`, the card becomes **ok:true** with `districts:null`. That's the "empty card that looks fine"
case 0006 §D forbids. **Fix:** return both the state and an error: `{ error: 'gateway_NO_FOREMAN_TICK', parsed: {...state} }`,
and have the envelope keep the parsed fields when `ok:false`. Do the same for any other `gateway_*` error. Change the test to
assert `ok === false`, `error === 'gateway_NO_FOREMAN_TICK'`, and `timer_state === 'no_tick'` still present.

**F2 (P1, hides failures): `board.errors` is dropped.** The foreman writes per-district GitHub queue read failures into
`board.errors` (scripts/district/foreman.js:158, and it exits 2 when non-empty). `parseDistricts` doesn't carry the field, so a city
where every queue read failed shows as a calm board of IDLEs. **Fix:** carry `errors` (strings, capped: first 10, 200 chars each)
and set `degraded: errors.length > 0`. Test: the code-derived fixture with `errors: ["impact: 403"]` → `degraded:true`, error text visible.

**F3 (P3, nit): `mission_id` is listed in the header comment but not parsed.** Carry it (`str(.., 80)`) so a RUNNING row can link to
`/v1/missions/<id>`. Fold it into the same push.

Stale handling (`stale:true` → `timer_state:'stale'`, data kept) is right. The UI must render it amber, not green. Please note that
in fixtures/README.md as an integration requirement.

## Next
Export the fix as `patches/0043-cc2-fixes.patch` (on top of d0e019b). I'll re-run and give the verdict.
Factory: **NOT READY**. The first `lane=free` dispatch is still owner-gated.
