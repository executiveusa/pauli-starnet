# STARFACTORY-001: Acceptance results and handoff

## A. Executive result

**Not production-ready. The repository-side vertical slice is built and verified against a Paperclip *contract double*;
nothing has been verified against a live Paperclip, live Hermes/Pi workers, a phone, or the owner's servers.**

What works and is tested (66 assertions, `test/factory.integration.test.js`, repeated 3 times with identical results,
plus 11 in `test/factory-status.test.js`): the real `gateway/workforce-server.js` process, driven over HTTP, delegates
a mission through Heisenberg to Pi, hands off to an independent QA agent, returns a failed review to the builder, passes
on the repair, and holds for owner acceptance, with no human relaying; it survives a SIGKILL mid-run; it refuses
unauthorized, paused, stopped, over-budget and restricted-permission work.

What is **not** proven: any of the above against real Paperclip; real Hermes/Pi executors; StarNet character
animation (the data layer and a status panel exist, the 9k-line `world.js` renderer is untouched); voice; on-demand
specialist activation; the overnight soak; costs.

Build-environment blocker: a local Paperclip could not be started here. The published `paperclipai@2026.1106.0` needs
Node >= 24.11 (obtained) and embedded PostgreSQL, whose `initdb` refuses to run as root and whose binary lacked the
execute bit; the sandbox permission checker declined creating a non-root user and declined a Docker probe. No workaround
was attempted. Running Paperclip with an external Postgres, or as a non-root user, would unblock a local live run.

## B. Test evidence

`double` = passes against `test/helpers/fake-paperclip.js` (a documented-API double, **not** Paperclip). `live` = against a real deployment.

| ID | Test | double | live | Evidence (assertion in `test/factory.integration.test.js`) |
|---|---|---|---|---|
| T01 | Paperclip restart keeps mission | NOT RUN | NOT RUN | Needs a real Paperclip; the double has no persistence to test. |
| T02 | Agent assignment wakes a worker | PASS | NOT RUN | "each stage had its own real worker run id"; "Paperclip woke the workers (we never called wake ourselves)" |
| T03 | Two-worker handoff, ID preserved | PASS | NOT RUN | chain `implement:1, review:2, repair:3, review:4`; "the mission id followed the work through every handoff" |
| T04 | Independent QA | PASS | NOT RUN | "every verdict was authored by the QA agent credential, not by the builder" |
| T05 | Correction loop | PASS | NOT RUN | verdicts `FAIL, PASS`; repair task created after FAIL |
| T06 | Crash recovery | PASS | NOT RUN | SIGKILL mid-run: idempotent Pi resumed once and finished exactly once, checkpoint `retry: 1`; non-idempotent Hermes **not** re-run, failure stated in Paperclip |
| T07 | Duplicate event | PASS | NOT RUN | replayed wake acknowledged as duplicate, "caused no second execution" |
| T08 | Pause blocks new work | PASS | NOT RUN | no executor call while Pi paused, including a stray wake |
| T09 | Resume continues | PASS | NOT RUN | resumed Pi ran the waiting task exactly once |
| T10 | Approval gate | PASS | NOT RUN | `deploy` parks with no tasks created; wrong scope 409; exact scope releases; accept refused without independent PASS; undeclared permissions fail closed |
| T11 | StarNet display matches state | PASS (data layer) | NOT RUN | "working" backed by the real run id; reconnect replays the real handoff; foreign epoch gets a resync. **No screenshot exists.** |
| T12 | Phone voice | NOT RUN | NOT RUN | Not implemented. |
| T13 | On-demand specialist | NOT RUN | NOT RUN | Not implemented (no specialist entry point was verified). |
| T14 | Budget cap | PASS | NOT RUN | review did not start once the mission budget was spent (uses executor-reported `usd`, not verified billing) |
| T15 | Unauthorized access | PASS | NOT RUN | 401 without token, owner token cannot wake a worker, worker token is not an owner credential, agent-id mismatch 403; no executor ran |
| T16 | Emergency stop | PASS | NOT RUN | workers paused, new wake 503, projection shows all agents `blocked` |
| T17 | Artifact provenance | PARTIAL | NOT RUN | each completed task comment carries the executor's artifact reference and run id. Real commit/PR linkage needs real executors. |
| T18 | Runs independent of desktop | NOT RUN | NOT RUN | The gateway is a standalone process, but this was not tested with a desktop closed on a server. |
| T19 | Multi-hour unattended mission | NOT RUN | NOT RUN | The test mission ran for seconds. |
| T20 | Honest reporting | PARTIAL | NOT RUN | every agent state carries evidence; "sleeping" is the default with no evidence. Not compared to authoritative logs on a live system. |

Regression: 40 existing tests touching the gateway, missions, workforce and `frontend/index.html` still pass (40/40).
The repo's full fast gate stops at step 77 (`test/media-service.test.js`: `ogg-opus-decoder` is not installed in this
container). That failure reproduces on a clean checkout and is unrelated to this change.

## C. Remaining blockers (exact)

| # | Blocker | Needed from | Unblocks |
|---|---|---|---|
| 1 | A Paperclip instance (existing or new) with an owner credential, company id, and per-agent API keys for Heisenberg, Pi, QA (and Hermes). Deployment on the VPS/Coolify is a production-infrastructure change. | Owner approval + credentials via a secure channel | T01, all `live` columns |
| 2 | The real Hermes and Pi execution endpoints and their auth (their repos are outside this session's scope). `executors.js` defines a proposed JSON contract; it must be matched to the real runtimes. | Owner: repo access or endpoint details | Real artifacts, T17, T19 |
| 3 | Confirm the 7 Paperclip API assumptions listed in `10_CONSOLIDATION_AND_INVENTORY.md` section 5 on the first live run. | First live run | Everything live |
| 4 | Command Center prerequisites (documented login / API-wiring blockers) and a phone test. Different repo. | Owner | T12 |
| 5 | StarNet character/room animation bound to the projection. The data layer, event stream and a status panel are done; `world.js` is untouched by design. | Follow-up PR | Full T11 with screenshots |
| 6 | On-demand specialist (lowest-cost first) wake -> run -> idle. | Verified entry point | T13 |
| 7 | Phase 0 server inventory (containers, ports, volumes, backups, revisions) and audit of `macs-starnet-`, `open-agent-platform-pauli`, `crownandcorestarnet`, `pauli-studio-control-plane`. | Server/repo access | Full consolidation ledger |

## D. Next action

**One action:** provide (or approve deploying) a Paperclip instance, then run
`FACTORY_GATEWAY_URL=... FACTORY_OWNER_TOKEN=... node scripts/factory-live-acceptance.mjs`. It runs the same
scenario against the real stack, never fabricates a result, marks steps it cannot observe `NOT_RUN`, and exits 0 only
when nothing failed and nothing was left unrun. Owner: you (credentials/approval). Approval needed: infrastructure
deployment and credential issuance.

## E. Rollback

See `11_OPERATIONS_RUNBOOK.md`: unset `PAPERCLIP_URL` and restart, or revert the PR. Nothing was migrated, deleted or deployed.
