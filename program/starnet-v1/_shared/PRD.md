# StarNet v1: product requirements

**Owner:** Bambú (captain) · **Date:** 2026-09-27 · **Consequence level:** HIGH
**Method:** ICM (folder structure is the architecture) + V.I.B.E. (Verify It Before Everything)
**Supersedes:** `docs/PRD_TRUTH_LEDGER_FIX.md` (its findings are folded in here) and the "retire Heisenberg"
line in `docs/COMMAND_BRIDGE.md` §2 (reversed in §2 below). Everything else in those docs still holds.

---

## 0. In plain words

StarNet is your city of AI workers. You talk to it the way you talk to a person. Instinct is on your phone
and WhatsApp; the Command Center is on a screen. Heisenberg is the foreman who runs the city. He hears the
job, splits it across his crew, checks their work and reports back. Every piece of work leaves a receipt,
and the city on the screen only shows what the receipts prove. Anything risky (money, publishing,
production, deleting, contacting a real person) waits for your yes.

The motto is "software that gets you out of your seat," so the main way to run the city is by voice, from
anywhere, with approvals on your phone.

## 1. The outcome

**North star:** a founder can run her whole operation by talking to it. Every status she sees is backed by
a receipt a stranger can check, and no agent can act outside its lane.

**Night-1 (the golden mission):** this is done when, on the live server, all of the following happen:

1. The captain says to Instinct: *"Heisenberg, get me a three-point brief on <topic>."*
2. Instinct sends one intent to Terabithia. Terabithia routes it to StarNet.
3. Heisenberg, a real agent in the running StarNet, dispatches **at least two crew members** through native
   `team.dispatch`.
4. The city map shows Heisenberg and those crew members working, because real tasks exist. Nothing is decorative.
5. The result returns with a **sealed receipt**: its hash links to the previous receipt, and it names the mission, crew, sources and commit.
6. Instinct speaks the answer and the receipt id.
7. The board (Instinct and the Command Center) shows the mission as `done`, read from the receipt.
8. `GET /health` on the StarNet gateway shows the deployed commit (`revision`), and it matches `feat/harness-backend`.

Negative tests on the same night (all must refuse):
- the same intent without a valid Terabithia bearer is refused;
- a crew member asked to publish or spend is refused and parked for the captain;
- a request aimed at Pi's personal lane from the city is refused.

**v1:** the golden mission, plus the phases in §9: phone approvals, clean districts, a signed bridge, work
leases, the walk-test gate, and separated tenants.

## 2. The cast: one name, one job

| Name | Job | Can | Can't |
|---|---|---|---|
| **Captain (Bambú)** | Decides and approves | Everything, by approval | n/a |
| **Instinct** | Front door by voice and WhatsApp (the default) | Send intents; read the board; browser hands in read mode | Act on servers, money or publishing; talk to Pi's lane |
| **Command Center** | Front door on a screen: board, city, approvals | Send intents; decide approvals (owner login) | Hold server keys; run shells |
| **Terabithia** | The bridge: the one gateway | Auth, policy tiers, approvals, audit, credentials, routing, receipts | Decide *what* to do |
| **Hermes** | First mate of the fleet | Plan business work, supervise missions across agents, keep watch; stand in for Instinct when it's down (Phase 2) | Pi's lane; irreversible actions without the captain |
| **StarNet** | The city runtime | Run agents, districts, capabilities, consent, Night Shift | Be reachable from the internet except through Terabithia and the read-only public city |
| **Heisenberg** | Foreman of the city: StarNet's lead orchestrator | Break a city mission into crew tasks with `team.dispatch`, merge results, attach evidence | Create new agents unattended (`team.summon` stays a captain decision); use a capability outside the mission's permissions |
| **District crews** | Do the work in their lane (native specialties: `scout`, `opportunist`, `reviewer`, `engineer`, `publisher`, …) | What their district's policy allows | Reach another district's data except through a mission |
| **BARS** | Engineering and operator work: code, video render, computer use | Missions routed `engineering` / `operator` | Personal keys |
| **Pi** | The captain's personal lane: health, life, money. Sealed | Talk to the captain | Take fleet missions; be read by other agents |
| **Jarvis, Lightning** | Presence, evaluation (existing fleet members) | Their routes | Anything else |

**Why Heisenberg is back.** On 2026-09-26 `COMMAND_BRIDGE.md` said to retire the name because it was only a
prompt label: a chat completion that dispatched nothing. That was true. The fix is not to delete the name;
it is to make it real. StarNet already has a lead orchestrator role with `team.dispatch`
(`sidecar/capability/registry.js:232`) and a `foreman` specialty (`shared/specialties.js:338`). Heisenberg
*is* that role. Hermes remains first mate for the whole fleet. Heisenberg is foreman inside the city.
The line between them: Hermes owns *which agent*, Heisenberg owns *which crew member inside StarNet*.

## 3. The system on one screen

```text
                         CAPTAIN
          voice / WhatsApp            screen
               │                         │
          ┌────▼─────┐           ┌───────▼────────┐
          │ INSTINCT │           │ COMMAND CENTER │
          └────┬─────┘           └───────┬────────┘
               └──── POST /api/v1/intents ┘        one intent shape (contracts.md §1)
                         │
                 ┌───────▼────────┐  auth · policy tiers · approvals (owner-only)
                 │   TERABITHIA   │  audit · credentials · receipts · fleet router
                 └─┬───┬───┬───┬──┘
       business ┌──┘   │   │   └──┐ personal (sealed)
          ┌─────▼──┐ city │  eng/op  ┌▼──┐
          │ HERMES │   │  │    │     │ PI│
          └────────┘   │  │  ┌─▼──┐  └───┘
                ┌──────▼──┐ │  │BARS│
                │ STARNET │ │  └────┘
                │HEISENBERG ─ team.dispatch → district crews
                └─────────┘
   Cross-agent work (e.g. Heisenberg needs a video render) goes back out through Terabithia as a
   HandoffRequest. It never goes directly from one agent to another.
```

## 4. What exists today (verified 2026-09-27 against each default branch)

| Piece | Exists | Missing for Night-1 | Where |
|---|---|---|---|
| Terabithia intents + fleet router | `POST /api/v1/intents` routes to hermes / pi / bars / jarvis / lightning; mission and result envelopes with evidence, human blockers, handoffs; decisions API | **No `starnet` agent and no `city` route**; one shared `TERABITHIA_API_KEY` for every caller | `terabithia/bridge/fleet/{server,registry,router,contracts}.ts` |
| Terabithia mission store | Durable if `SUPABASE_URL` + service key + operator id are set, otherwise in-memory | Which Supabase project it points at is unverified (the class is named `MaxxMissionStore`; see §8) | `bridge/fleet/store.ts:86` |
| Terabithia A2A gate | Deny-by-default policy, YELLOW/RED need approval, mandatory audit | Not wired into the server; off unless `COSMOS_A2A_POLICY_ENABLED=1`; nothing is signed | `bridge/a2a/*` |
| StarNet orchestrator | Lead role with `team.dispatch` + `team.summon`, `foreman` specialty, native crew catalog | **A headless run can't dispatch.** Grantable unattended powers are only `workbench` and `connectors` (`sidecar/inputpolicy.js`); dispatch needs consent and there is no screen. The gateway runs agent `agent` with the web-research profile and only a `dish`, so it runs one researcher and no crew | `sidecar/inputpolicy.js`, `gateway/server.js:158` |
| StarNet gateway (Node) | Async 202 + poll, `/v1/city/status`, `/v1/city/world`, commerce evidence routes, `revision` (#41, open) | In-memory task store (lost on restart, bug G7); not yet a Terabithia fleet member | `gateway/server.js` |
| Hermes StarNet gateway (Python) | Durable task files, honest status (#174), public at `/starnet-gw` (#175) | A second gateway doing the same job. "Heisenberg" there is one chat completion | `pauli-hermes-agent/starnet_gateway.py` |
| Hermes kanban | Dispatcher with heartbeats; stale tasks reclaimed (4 h default) | The lease model to reuse in Phase 5 | `hermes_cli/kanban*.py`, `agent/prompt_builder.py:200` |
| Instinct | `dispatch_to_hermes` tool, board reader (HTTP URL with file fallback), confirm-before-write browser hands | Its payload `{task, source, front_agent}` does not match Terabithia's `CreateMissionInput`; env not set | `instinct_vision_agent.py:101`, `hands.py:67` |
| Command Center | Owner login, owner-only approve route, Terabithia control-plane client | Three chat paths (C6); StarNet client talks to the gateway directly | `src/lib/*control-plane*.ts` |
| BARS | Accepts `engineering` / `operator` missions, video renders with idempotency keys, returns receipts | `PAULI_CONTROL_URL/TOKEN` must be set on the server | `terabithia_adapter.py` |
| Public city | Netlify function builds the public DTO; #41 adds `revision`, honest repo activity and `unknown` citizens | Production runs an older gateway and shows six `online` | `frontend/city/deploy/netlify/functions/gw.mjs` |
| Receipts | Approval hashes (`stableHash`), per-run receipts, append-only run journal | No chain, no signatures; the board is not derived from receipts | `sidecar/governance/tenant-policy.js:55` |

## 5. The golden mission, step by step

Contracts for every hop are in `contracts.md`. Each step lists the file that changes.

1. **Instinct → Terabithia.** `dispatch_to_hermes` becomes `dispatch` and posts `CreateMissionInput` to
   `TERABITHIA_URL/api/v1/intents` with its own bearer. When the captain names an agent ("Heisenberg"),
   it sets `preferred_agent: "starnet"`. It speaks `summary` + `receipt_id` from the result and never
   claims completion without one. *(instinct-voice-agent: `instinct_vision_agent.py`, `hands.py`)*
2. **Terabithia routes.** Add fleet agent `starnet` (route `city`, runtime env `STARNET_URL`, own token
   `STARNET_TOKEN`). The router matches "Heisenberg" / "city" / district names to `city`. The fleet client
   sends the `MissionEnvelope` to the StarNet gateway. *(terabithia: `bridge/fleet/{registry,router,contracts,client}.ts`)*
3. **Gateway → sidecar.** New `POST /v1/missions` on the StarNet gateway: validates the envelope,
   persists the task to disk (fixes G7), and calls a new **loopback** sidecar route that starts a
   Heisenberg run. *(pauli-starnet: `gateway/server.js`)*
4. **Heisenberg runs with a crew grant.** A new loopback sidecar route, `POST /api/missions/run`, runs the
   foreman (roster agent `agent`, or `STARNET_FOREMAN_AGENT`) on the unattended surface with the host-only run
   option `crew: true`. The consent broker then allows exactly `team.dispatch`, and never `team.summon`,
   `team.spawn`, shell or writes (`sidecar/permissions.js` `crewAutonomy`). It is not a storable routine grant:
   no API body or saved job can mint it. It is revoked by taint. Crew runs keep the lead's default-deny posture.
   *(pauli-starnet: `sidecar/permissions.js`, `sidecar/index.js` `handleMissionRun`)*
5. **The city shows real work.** Dispatched crew tasks appear in `activeTasks` with `context.agentId`, so
   the world moves only those bodies (`worldWorkSet`). No change is needed beyond #41.
6. **Result + receipt.** Heisenberg's merged answer returns as a `ResultEnvelope` with `artifacts` (crew
   task ids, source URLs, tool-call refs). Terabithia seals the receipt (hash chain, `contracts.md` §4)
   and stores it with the mission. *(terabithia: `bridge/fleet/engine.ts` + new `bridge/receipts/`)*
7. **Board.** The board is `GET /api/v1/missions` + `GET /api/v1/decisions`, shaped for voice. Instinct's
   `INSTINCT_BOARD_URL` points at it. The Command Center reads the same. *(instinct `hands.py`, command center board client)*
8. **Deploy with the commit.** The gateway starts with `STARNET_REVISION` set; `/health` proves it (#41).

## 6. Requirements

**R1 One intent shape.** Every front door sends `CreateMissionInput` to Terabithia. No second path.
**R2 One StarNet edge.** The Node gateway is StarNet's only service edge. Only Terabithia (missions) and the
public city function (read-only status and world) call it. The Hermes `starnet_gateway.py` is retired once
03 + 04 pass (decision D1).
**R3 Real foreman.** A city mission is handled by Heisenberg with native `team.dispatch`. A mission that
produces fewer than one crew task is reported as `done_solo` and never presented as crew work.
**R4 Narrow crew grant.** `crew` = `team.dispatch` only. It is a host-only run option set by the mission route,
GREEN only, never stored, and tested so that prompt text, model output and tool output can never mint it.
**R5 Durable.** Gateway tasks and Terabithia missions survive a restart. Interrupted work is marked
`failed: interrupted`, never left `working`.
**R6 Sealed receipts.** Every mission ends with a receipt in a hash chain. Editing any past receipt breaks
verification. `scripts/verify-receipts` proves the chain.
**R7 Board from receipts.** Every status any surface shows is computed from missions and receipts. No
hardcoded `live`, `online` or `LIVE`.
**R8 Tiers.** GREEN runs. YELLOW and RED create a decision (`needs_human` + `resume_token`) that only the
captain's owner login can grant. Night-1 proves YELLOW parks. Phase 2 adds approve-from-phone.
**R9 Lanes hold.** City missions cannot reach Pi. Pi #66 already refuses Hermes, BARS, Jarvis and
Lightning as sources; `starnet` must be added to that refusal list in the same change that makes it a fleet member.
Crew members cannot use another district's connectors.
**R10 Every repo passes the walk test** (Phase 3 gate): a small entry router, a contract per working
folder, status derivable from files.

## 7. Laws (non-negotiable, every repo, every agent)

1. **Verify It Before Everything.** No claim without a receipt a stranger can check: a commit SHA, run
   URL, raw output or receipt id.
2. **Builder ≠ verifier.** The agent that built something never marks it verified.
3. **Default deny.** An action not explicitly allowed is refused.
4. **The captain approves consequences:** money, publishing, production deploys, deletes, contacting real people.
5. **One key per caller, one home per fact, one name per agent.** No fallback chains between keys.
6. **Blast radius:** each district and tenant has its own identity, data, budget cap and kill switch.
7. **Nothing decorative:** the city and every board show only what receipts prove; unknown stays `unknown`.
8. **Secrets never in files.** Name the variable, never its value.

## 8. Districts, tenants, identity

**Crypto Cuties is a district of the captain's city.** It has its own identity; the captain approves for it.
It is separate from Impact, Creative and every other district.

Verified problems to fix in Phase 3:
- **Three district lists disagree.** The map (`frontend/*/cityos.js`) has 13, the registry
  (`registry/districts.yaml`) has 7, and the folders (`districts/`) have 5. Only Creative and Crypto Cuties
  are in all three. **Impact exists only on the map.** Fix: `registry/districts.yaml` is the one home; the map
  and folders are generated from it or checked against it.
- **The name `fanni` means two agents:** Cuties' CC-003 Fanni (`executiveusa/fanni`) and Kupuri's social
  agent (`executiveusa/agent-fanni-kupuri-`, granted `social.prepare` in `registry/policy.v1.json`). Fix:
  namespace every agent id by district or tenant (`cuties.fanni`, `kupuri.fanni`).
- **The policy file knows tenants, not districts.** Fix: add districts as a policy scope, default deny
  between them, and cross-district work only as missions.
- **The city map code exists in four copies** (`frontend/app`, `frontend/city`, `frontend/city/deploy`,
  `website/app`). Fix: one source plus a build step.

**Tenants:** Kupuri (Ivette) and MACS / Max Digital Media are separate tenants with their own repos, keys and
data, and they cross only through Terabithia.
- **MACS gets its own server** (D3, decided 2026-09-27). Until it moves, it shares a box with the city preview.
- **Our data lives in our own self-hosted Supabase** (D4, decided 2026-09-27). It runs on the captain's server
  and holds Terabithia's mission store (`SUPABASE_URL`) and a mirror of the receipt chain. It never uses the
  MACS / Agent MAXX project or any other tenant's database. Each tenant that needs a database gets its own.

## 9. Phases after Night-1

| Phase | Outcome | Acceptance (proof required) |
|---|---|---|
| **P2 Approvals + standby** | YELLOW/RED decisions reach the captain's phone; approve or deny from Command Center or Instinct (spoken confirm + PIN). Hermes answers WhatsApp when Instinct is silent for 5 min. | An approval granted from the phone executes exactly the approved scope; an agent key can't approve; a takeover and hand-back are logged |
| **P3 Districts + walk gate** | One-home district registry, namespaced agents, Impact folder + contract, districts in policy. Vibe-engineering ships the walk-test + fake-success check, and every repo runs it | Every repo's entry router is under 60 lines; every working folder has a contract; the check fails on a planted `live:true` and on a district present in only one list |
| **P4 Signed bridge** | Ed25519 keys per city and agent; every envelope signed; approvals signed by a passkey on the captain's phone, bound to the envelope hash; treaties between cities | Unsigned, tampered, replayed and out-of-treaty messages are all refused, with tests; a stolen approval can't be reused for a different action |
| **P5 Work leases** | Per-task lease with heartbeat and expiry, fencing number on reassignment, idempotency key on every consequential action. Reuse Hermes kanban heartbeats + StarNet `workspace-lease` | Kill a crew member mid-task and another resumes it; the stale holder's writes are rejected; no double charge in the test |
| **P6 Receipts for clients** | Receipts signed and mirrored off-box; a client-facing proof page | Anyone can verify a receipt chain with a public key |
| **P6b Own data + MACS move** | A self-hosted Supabase on the captain's server (own volume, backups, no public admin port). Terabithia's `SUPABASE_URL` points at it and its existing missions are migrated. MACS moves to its own server with its own keys, and nothing of ours remains on it | `SUPABASE_URL` resolves to our host; a restore from backup is tested; a scan of the MACS server finds no fleet data or keys; a scan of ours finds no MACS data |
| **P7 Tenants + team cities** | Kupuri first (template), then MACS, then one StarNet per teammate from the template | Cross-tenant read/write denied in tests; a new teammate city boots from the template and passes the walk test |
| **P8 Research play** | Three models from different families answer; a merger lists agreed / disputed / unsourced; the polish step can't add claims | A planted false fact in one answer shows up as disputed, not as fact |
| **P9 Impact district live** | Impact shows real outcomes from receipts only | Every Impact number links to receipts |

## 10. Owner actions and decisions

Needed for Night-1:
1. Remove the required `watch` check on `feat/harness-backend` (it never runs on PRs), then merge #41 and the Night-1 PRs.
2. Set on the server: `STARNET_REVISION` (at deploy), `STARNET_URL` + `STARNET_TOKEN` in Terabithia (same token as the gateway's
   `GATEWAY_BEARER_TOKEN`), Instinct's `TERABITHIA_URL` + its bearer, and the earlier set (`OWNER_APPROVAL_KEY`, `PI_TOKEN`, `BARS_TOKEN`).
3. The server agent deploys and pastes raw output into `06_proof-run/output/EVIDENCE.md`.
4. For P6b: report which Supabase project Terabithia's `SUPABASE_URL` points at today (name and host only, no keys).

Decisions:
- **D1** Keep the StarNet Node gateway as the one edge and retire Hermes `starnet_gateway.py` after cutover. *(recommended)*
- **D2** Crew grant = `team.dispatch` only, GREEN only. *(recommended)*
- **D3 (decided 2026-09-27)** MACS gets its own server.
- **D4 (decided 2026-09-27)** Self-host Supabase on our own server for our data. Terabithia's mission store
  points there, never at a tenant's project.

## 11. Risks and honest limits

- **"Tonight" is realistic for the Night-1 slice only.** It needs the code (stages 02–05, about four PRs),
  the owner actions above, and a server deploy tonight. The full v1 is weeks of phases, not one night.
- **Private-repo CI is unreliable.** Actions minutes ran out on 2026-09-26, and the `watch` check blocks
  StarNet PRs. Local test output is attached to each PR until CI runs.
- **Free models are rate-limited** (the JEV researcher chain hit this). The golden mission must name its model chain and fail honestly.
- **Crypto proves who and unchanged, not true.** Truth still comes from evidence and an independent verifier.
