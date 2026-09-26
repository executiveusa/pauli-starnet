# PRD: Make StarNet true, then make it work

**Date:** 2026-09-26 · **Owner:** Bambú (Jeremy) · **Consequence level:** HIGH (public claims, client districts, credentials)
**Input:** the independent truth ledger of 2026-09-26 (05:45 CST), re-checked against the repositories, the live status endpoint and CI on the same day.

## 1. What the report is, and how accurate it is

The report is an **audit**, not a completion claim: it says it changed nothing. It is careful. It labels most things PARTIAL or UNVERIFIED rather than FAKE, and it says clearly what it couldn't check (servers, CI runs).

Every claim I could re-check held up.

| Report claim | Re-check (2026-09-26) | Result |
|---|---|---|
| Crypto Cuties logs are header-only, roster `draft` | all 4 CSVs have 1 line; `ROSTER.yaml` `status: draft` | **Confirmed** |
| Cuties site routes `/dating`, fakes matchmaking, Terms/Privacy go to `/dashboard` | `src/App.tsx:34`, `Dating.tsx:24` "Simulating AI-based matchmaking", `Index.tsx:116-117` | **Confirmed** |
| Cuties has no test script | scripts: `dev build build:dev lint preview` | **Confirmed** |
| Kupuri DRAFT, MACS STRUCTURE ONLY | `DISTRICT.md` headers say so themselves | **Confirmed** |
| Manny consult log empty; 315/554 transcripts claimed, not in repo | `consult-log.md` has 2 lines; no transcript files in the repo | **Confirmed** |
| MACS connectors all `not-configured`, data empty, `production:false` | `connectors/catalog.json`, `data/*.json` | **Confirmed.** Tests: **7/7 pass** (the auditor didn't run them) |
| AfroMations hard-disabled, has tests | `live:False`, `deploy_allowed:False`; DB `CHECK(live_enabled=0)` | **Confirmed.** Tests: **40/40 pass** (the auditor didn't run them) |
| StarNet has an eval gate but no proof it ran | `eval-gates` **passed** on head `0d17ca11` (run 36221074707); daily staging eval passed | **Now proven** |

### What the report missed (found in the re-check)

1. **`live:true` on the public city is hardcoded.** `gateway/server.js` returns `health: {status:'online', starnet:{ok:true}}` as literal values. The city says "live" whenever the gateway process answers, even if no agent or sidecar works. **FAKE signal.**
2. **The activity feed credits agents with work they didn't do.** `frontend/city/deploy/netlify/functions/gw.mjs` reads the owner's public GitHub event stream and assigns each event to a citizen by hash. Events under 20 minutes old show as `running`. At check time the feed showed "HEISENBERG · running · pr opened → pauli-starnet": that was a PR opened by a Claude Code session, not by HEISENBERG. **Misattribution.** The code comment admits `receipt:false`, but the UI shows it as agent work.
3. **Production is behind the code.** The live endpoint shows every citizen `online`. The `feat/harness-backend` code (PR #37, merged) reports `unknown` without a heartbeat. So the deployed gateway is older than the branch, and nothing shows which revision is running.
4. **13 secrets in StarNet's git history.** `secret-history` (gitleaks, full history, 8,482 commits) failed on the #37 merge with "leaks found: 13". The earlier fix covered the PR diff only.
5. **A workflow fails every ~10 minutes, around the clock.** `sync-source-release` pushes tag v0.12.4 to `androoAGI/starnet-releases` and gets `gh: Not Found (HTTP 404)`. Either the repo is gone or the token can't see it.
6. **MACS API fails open.** In `macs-starnet-/app/server.js`, `auth()` returns true when `MACS_COMMAND_TOKEN` is unset and `NODE_ENV` isn't exactly `production`. One missing environment variable makes the private command API public.

## 2. Real vs not, in one table

| Area | Built and working | Built, not operating | Not built | Misleading today |
|---|---|---|---|---|
| StarNet city web + gateway | page, gateway, auth fix (#37), eval gate green | — | heartbeats, receipts per agent | `live:true`, agent-attributed GitHub feed, stale deploy |
| Crypto Cuties | ICM folders, roster, policy | Mila identity work (unverified) | shop, content, sales, evals, tests | dating prototype if called "the Shop"; Terms/Privacy links |
| Manny (marketing) | principles, scripts, indexing tool, 1 draft answer | Hermes route (written, not run) | consult loop, evals, routing | — |
| MACS | local backend + UI, 7 tests pass, public sites load | — | connectors, clients, tasks | API open if token missing |
| Kupuri | portfolio site loads, district files | — | any operation | — |
| AfroMations | local city runtime, 40 tests pass | — | live adapters (deliberately off) | — |
| CI | eval-gates, daily eval green | — | — | two workflows permanently red |
| Servers | unknown | unknown | read-only inventory | — |

## 3. Goal

Every public or owner-facing status in StarNet is **computed from a receipt**, and each district reaches "operational" only when a real mission has run end to end with a receipt.

**Definition of operational (per district):** in the last 7 days there is at least one mission that went through dispatch → worker → tool → receipt, plus one refused mission that shows a gate working. Both are visible in the Command Center, and the status is generated by a script, not written in prose.

**Non-goals:** new districts, new agents, 3D city, more skills imports. Nothing new until what exists tells the truth.

## 4. Work, in order

### Phase 0: stop the lies (StarNet, ~1 day, no owner input needed except deploy)

| # | Change | Acceptance test |
|---|---|---|
| T1 | `live` is computed: the gateway probes the sidecar (`/health`) and reports `live:true` only if the sidecar answered within the last 60s. `starnet.ok` is the probe result. | Stop the sidecar → status shows `live:false` within 60s. Unit test covers both. |
| T2 | GitHub pulse rows get `agent: null`, `source: "github"` and state `observed`, never `running`. The UI labels them "repo activity", not agent work. An agent is named only when a gateway task links the event. | `test/gw-function.test.js`: a pulse event never carries a citizen name. The city HUD shows "repo activity". |
| T3 | Status includes `revision` (the deployed commit SHA, set at deploy). | `revision` equals the `feat/harness-backend` head within 1h of a merge. The watchdog (PR #39) alerts otherwise. |
| T4 | Deploy the #37 gateway to the box. | Live status shows citizens `unknown` (not `online`) until heartbeats exist. |
| T5 | Citizen status comes from a heartbeat file or endpoint the worker writes; no heartbeat in 5 min → `unknown`. | Kill a worker → its citizen goes `unknown`. |

### Phase 1: make the gates honest (~1 day; owner decisions marked ●)

| # | Change | Acceptance test |
|---|---|---|
| C1 ● | Triage the 13 leaks: list them (redacted) by file and commit, and **rotate every credential that is still live**. Then add only the revoked ones to a gitleaks baseline. Never rewrite history without the owner. | `secret-history` green; each baseline entry has a "revoked on" note. |
| C2 ● | `sync-source-release`: confirm whether `androoAGI/starnet-releases` should exist. If yes, fix the token. If no, remove the schedule. | No run of it fails for 24h. |
| C3 | Merge the red-gate watchdog (PR #39) and add the `FLEET_READ_TOKEN` secret (read-only). | Issue lists red gates daily; closes when green. |
| C4 | MACS: `auth()` fails closed when the token is missing, whatever `NODE_ENV` says. | New test: no token + `NODE_ENV` unset → 401. |

### Phase 2: fix the misleading product (Crypto Cuties, ~1 day)

| # | Change | Acceptance test |
|---|---|---|
| K1 | Remove the `/dating` prototype from the public build, or label it "demo, not a product" on the page. Remove the fake matchmaking. | No page claims AI matching; e2e test visits every route. |
| K2 | Real Terms and Privacy pages (owner approves the text ●). | Links resolve to pages with content, not `/dashboard`. |
| K3 | Add `test` (Vitest + one Playwright smoke). Wire it into CI. | CI runs and passes on the default branch. |
| K4 | The Shop is described as "coming", not live, until the Crypto Cuties proof mission in Phase 3 has receipts. | Copy review. |

### Phase 3: one real mission per district (~1 week, needs the servers)

Each district gets a **proof mission**: a small, owner-approved task that runs through the real path and writes a receipt. Log rows are appended by code, not by hand.

| District | Proof mission | Negative test | Receipt location |
|---|---|---|---|
| Manny | Hermes routes a question to Manny; the answer cites principle files; `consult-log.md` gets a dated row | question outside marketing is refused or routed elsewhere | `advisors/manny-the-manager/icm/memory/consult-log.md` |
| Crypto Cuties | one content draft generated, evaluated against the roster rubric, sent to the owner for approval; `content-log.csv` row | posting without approval is blocked | `districts/crypto-cuties/icm/memory/content-log.csv` |
| MACS | a task created in the command API, executed by BARS, receipt stored | unauthenticated call → 401 | `data/tasks.json` receipts |
| Kupuri | one portfolio update drafted and held for Ivette's approval | publish without approval blocked | district ledger |
| AfroMations | a local mission run through `starnet_city/runtime.py` with an effect held for approval | `deploy` action refused (already enforced) | SQLite approvals table |

Then `scripts/district-status.mjs` reads the receipts and generates the district table. That table replaces every hand-written "operational" claim.

### Phase 4: close the audit's open items (owner-run, read-only)

| # | Change | Acceptance test |
|---|---|---|
| S1 ● | A read-only inventory script run on both boxes (`31.220.58.212`, `2.25.241.209`). It reports services and containers, the git SHA of each deployed repo, cron jobs, health endpoints and recent receipts, with secrets redacted. It's committed as `ops/receipts/server-inventory-<date>.json`. | Both files exist; every public hostname maps to a service and a SHA. |
| S2 | The new box: a request to `2.25.241.209` with the right `Host` header returns 200 for each service. | Recorded in the inventory. |
| S3 | Manny transcripts: count and hash the files on the box; commit the manifest (not the transcripts). | The manifest count matches `TRANSCRIPT-STATUS.md` (315), or the doc is corrected. |
| S4 | `docs/INPUT_LEDGER.md`: every owner-supplied link, zip and PDF from the report's catalog gets a status: **built** (with code path + test), **planned**, or **not doing** (with reason). Nothing counts as "learned" without a code path. | Every row has a status; no "done" without a path. |

## 5. Rules for the agents doing this

- Nothing is called working without a receipt a stranger can check: a run URL, a commit SHA or a log row.
- Default to showing `unknown`; never `online`/`live`/`running` without evidence.
- Owner decisions (●) are asked, never assumed. This covers rotating keys, deleting workflows, legal text, publishing and spending money.
- Each phase is its own PR, and all the PRs go through the Vibe merge gate (vibe-engineering#61).

## 6. Owner actions, in one list

1. Deploy the current `feat/harness-backend` gateway (T4).
2. Look at the 13 leak findings and rotate what is live (C1).
3. Decide whether `androoAGI/starnet-releases` should exist (C2).
4. Add the `FLEET_READ_TOKEN` (read-only) and `ANTHROPIC_API_KEY` secrets.
5. Approve the Terms/Privacy text for Crypto Cuties (K2).
6. Run the read-only server inventory on both boxes (S1).
