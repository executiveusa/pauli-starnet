# STARFACTORY-001: Consolidation ledger and service inventory (Phase 0, repository side)

Scope of this document: what was **inspected in `executiveusa/pauli-starnet`** and what the implementation changed.
No server, Coolify, VPS, Paperclip deployment, Hermes, Pi or Command Center instance was reachable from the build
environment, so everything about live infrastructure is listed as **UNVERIFIED** at the bottom, not assumed.

## 1. Mission-authority map (who can create or hold a "mission" today)

| Path | What it holds | Durable? | Decision |
|---|---|---|---|
| `gateway/workforce-server.js` `POST /v1/workforce/missions` | mission records in a process-local `Map` | **No** (lost on restart) | **MERGE into Paperclip.** When `PAPERCLIP_URL` is set, missions are created in and read from Paperclip; the `Map` is not used. Unset, behaviour is unchanged. This closes known issue A. |
| `gateway/missions.js` (Terabithia mission desk) | one JSON file per mission, GREEN (read-only) lane only; everything else parks as `needs_human` | Yes, file-backed | **KEEP as an adapter** for the Terabithia envelope. Not touched. It must not become a second authority for factory work: factory missions go through `/v1/factory/missions`. |
| `sidecar/workforce/*` | agent blueprints, mission *planning* (no execution proof) | n/a (pure planning) | **KEEP.** Reused unchanged by the gateway's plan step. |
| `sidecar/pauli-registry.js`, `pauli-canon-sync.js` | agent/skill/tool registry with provenance (from the paperclip-pauli-clip import) | Yes | **KEEP.** It is a provenance registry, not a task scheduler; it does not compete with Paperclip's work assignment. Review again when the capability registry (PRD section 7) is built. |
| `sidecar/cron-driver.js`, `loopjob-driver.js`, `checkpoint-store.js`, `durable-store.js` | local scheduling and run checkpoints for the desktop harness | Yes | **KEEP / PARK as authority.** They drive local harness runs. They are not read by the factory, and the factory does not call them. Retire nothing without live parity tests. |
| **New:** `gateway/factory/*` | no mission data (see below) | n/a | Adapter only. |

Nothing was deleted, disabled or archived.

## 2. What the factory stores, and why it is not a second mission database

| Data | Where it lives |
|---|---|
| Mission, tasks, dependencies, assignments, status, comments, verdicts, approvals-of-record | **Paperclip** (issues, parent/child, comments) |
| `receipts/<runId>.json`: the executor result for one worker run | factory state dir (`FACTORY_STATE_DIR`), mode 0600 |
| `checkpoints/<taskId>.json`: where a worker run was, for restart recovery | factory state dir |
| `control/stop.json`: the emergency-stop flag | factory state dir |

Receipts and checkpoints exist only so a crash can never repeat a side effect (PRD section 9). They carry no
mission intent, acceptance criteria or history that Paperclip does not also hold.

## 3. Components added (all under `gateway/factory/`)

| File | Role |
|---|---|
| `paperclip-client.js` | Stateless REST client for Paperclip (issues, comments, checkout, agents pause/resume, run cancel, approvals, costs, activity). |
| `planner.js` | Pure function: `implement -> review -> [repair -> review]* -> owner acceptance`. No I/O. |
| `heisenberg.js` | Chief-of-Staff adapter: submits missions, finds existing ones before creating (idempotent), reconciles the next handoff from Paperclip state, owner authorize/accept, emergency stop. Holds no state. |
| `worker-bridge.js` | Target of Paperclip's `http` adapter. De-duplicates by `runId`, claims the task, runs the worker, persists the result **before** reporting, recovers after a crash. |
| `executors.js` | `sidecar` (existing StarNet `/api/run`) and `http` (existing Hermes/Pi runtime) executors. |
| `projection.js` | Read model + SSE for StarNet. States are derived from records, each with evidence. |
| `index.js` | Environment wiring and `/v1/factory/*` routes. Returns `null` (no behaviour change) when `PAPERCLIP_URL` is unset. |
| `gateway/factory/ui/*` | Status page (`GET /v1/factory/ui`, static, no data, strict CSP). Renders only stream events; shows `unknown` when disconnected. It lives outside `frontend/` on purpose: `frontend/app/*.js` and `frontend/index.html` are locked by `qa/product-perfect/claims.json`, and adding to them needs an owner-reviewed ledger regeneration. |

## 4. Authority and approval boundaries implemented

* **Owner routes** (`/v1/factory/*` except `wake`) sit behind the gateway bearer (`GATEWAY_BEARER_TOKEN`).
* **Worker wake** (`/v1/factory/wake/:worker`) uses a *different* credential (`FACTORY_WORKER_TOKEN`); the owner token cannot wake a worker, and a worker token cannot read state or approve. Unconfigured means closed.
* **Autonomous permissions**: `read, research, web.read, repo.edit, pr.create, delegate`. Anything else (for example `deploy`, `spend`, `external.send`) or *no declared permissions at all* parks the mission as `blocked` with **no task created** until the owner authorizes **exactly** that scope.
* **Independent review**: a verdict counts only if it was authored by the QA agent's own Paperclip credential and the QA agent is not the builder. Otherwise Heisenberg escalates. QA has **no fallback to the service credential**: the gateway refuses to start unless `FACTORY_ROLES.qa.apiKey` is set and differs from `PAPERCLIP_TOKEN` and from every other role's key.
* **A wake is a request, not an authority.** Before any checkout or execution the worker bridge verifies against Paperclip that the task is a factory task (stage title), belongs to this company, is assigned to *this* worker, fits the worker (review only by QA, build only by non-QA), is `todo` (or `in_progress` only when the bridge itself started it, for crash recovery; never `blocked`, `done`, `cancelled`, `in_review` or `backlog`), and that its parent mission is live and authorized. A restricted mission's tasks additionally need the owner's authorization **of record in the gateway** (written only by the owner-gated `authorize` route), so flipping a status inside Paperclip is not enough.
* **One run per task.** Two different run ids can never execute the same task: an in-process claim plus an exclusive per-task lock file (stale locks from dead processes are taken over). A completed task is never re-executed; a task a non-idempotent executor started and never finished is never repeated by another run id.
* **Completion**: a mission can reach `done` only through the owner's `accept`, which is refused unless an independent PASS is on record. A worker saying "done" completes its task, never the mission.
* **Nothing is merged or deployed by this code.** Executors are told not to.

## 5. UNVERIFIED (must not be reported as done)

* Whether Paperclip is already deployed, its version, URL, database, backups, reverse proxy, or access mode.
* Live Hermes, Pi/Cosmos and Command Center endpoints, auth, and task transport. Their repositories were **not** inspected (outside this session's repository scope), so the `http` executor contract in `executors.js` is *proposed*, not matched to a verified Hermes/Pi endpoint.
* Running containers, ports, Coolify apps, volumes, secrets, and the deployed SHA of every service.
* The audit repositories: `macs-starnet-`, `open-agent-platform-pauli`, `crownandcorestarnet`, `pauli-studio-control-plane`, and the Motion Master / Buffer Blaster entry points.
* Paperclip API details this code assumes from its public docs and **must be confirmed on the first live run**:
  1. `GET /issues?view=index` returns `title`, `status`, `assigneeAgentId`, `parentId`.
  2. `parentIds` filter works with `view=index`.
  3. Comment objects expose the author as `authorAgentId` (or `author.agentId` / `agentId`).
  4. `PATCH /issues/:id` accepts `comment` as a string.
  5. `POST /issues/:id/checkout` accepts `{ agentId, expectedStatuses }`.
  6. An agent's `status` is `paused` / `terminated` when paused / terminated.
  7. The `http` adapter wake payload is `{ runId, agentId, companyId, context: { taskId } }` and honours configured headers.
