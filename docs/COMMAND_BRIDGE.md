# Command Bridge — one front door, clear lanes, simple failover

**Status:** proposal + audit, 2026-09-26. Read by: owner, Hermes, Instinct, any coding agent.
**Scope:** StarNet (`pauli-starnet`), Command Center (`pauli-command-center`), Hermes
(`pauli-hermes-agent`), Instinct voice bridge (`instinct-voice-agent`), Pi (`pauli-pi-agent`).

This file supersedes the *naming* in [HEISENBERG_FIRSTMATE_ARCHITECTURE.md](HEISENBERG_FIRSTMATE_ARCHITECTURE.md):
the first mate is **Hermes**. Everything else in that document (StarNet stays the runtime, consent
stays native, evidence before claims) still holds.

---

## 1. The whole system on one screen

```text
                      YOU (captain)
      WhatsApp / voice          phone browser
            │                        │
     ┌──────▼──────┐          ┌──────▼──────────┐
     │  INSTINCT   │          │ COMMAND CENTER  │   UI only. Shows state, sends intents,
     │ (voice +    │          │ (owner login)   │   decides approvals. Owns nothing.
     │  WhatsApp)  │          └──────┬──────────┘
     └──────┬──────┘                 │
            │  POST /v1/intents      │  same endpoint
            └──────────┬─────────────┘
                ┌──────▼──────┐   heartbeat watch: Instinct silent > 5 min
                │   HERMES    │◄── → Hermes answers WhatsApp itself (same board,
                │ first mate  │      same intents, same receipts)
                └──┬───────┬──┘
     dispatch      │       │   dispatch (business lanes only)
         ┌─────────▼─┐   ┌─▼─────────────┐
         │  STARNET  │   │  other crews  │  (factory, commerce, creative…)
         │  runtime  │   │  via adapters │
         └───────────┘   └───────────────┘

     ┌───────────────────────────────────┐
     │  PI — personal lane (sealed)      │  health, life, money. Talks ONLY to you
     │  own token, own store, no fleet   │  (Command Center /pi + its own chat).
     │  tools, no business data          │  Hermes can't read it; Pi can't dispatch.
     └───────────────────────────────────┘
```

Three rules make this simple:

1. **One intent endpoint.** Every front door (WhatsApp, voice, Command Center) sends the same
   `POST /v1/intents {text, source, captain_id}` to Hermes and gets back
   `{receipt_id, status, answer?, needs_decision?}`. There's no second path.
2. **One board.** Hermes owns a single status board (`GET /v1/board`): summary, workstreams,
   receipts, parked items, open decisions. Instinct reads it, Command Center reads it, the
   phone voice reads it. Right now the board is a local file on one VPS (`board.json`), and that's the
   coupling to delete.
3. **One approval path.** Decisions go `Command Center → Hermes → StarNet native consent`
   (`/api/consent/answer`). Until that seam is wired, every surface says *"approve in StarNet"*.
   None of them claims it recorded a decision (see bug G2).

## 2. Who does what (lanes)

| Agent | Job | Can touch | Can't touch |
|---|---|---|---|
| **Instinct** | Your voice and WhatsApp front. Hears you, reads the board, sends intents, speaks answers. Default channel. | `/v1/intents`, `/v1/board`, its browser "hands" in read-only mode | Direct StarNet, Pi, money, publishing |
| **Hermes** | First mate (firstmate model): turns intent into missions, dispatches crews, supervises, escalates only real decisions, keeps the board. **Standby for Instinct.** | StarNet gateway, crew adapters, board, receipts | Pi lane, secrets in chat, anything irreversible without your word |
| **StarNet** | Runtime. Agents, capabilities, consent, spend, Night Shift. | Its own workspace | Public internet (loopback only, behind one gateway) |
| **Pi** | Personal agent: health, life, finances. **Sealed lane.** | Its own store + read-only personal connectors you grant (calendar, bank read, health export) | Fleet, business repos, Hermes, StarNet, WhatsApp fleet channel |
| **Command Center** | Your screen. Shows board, city, approvals; sends intents. | Hermes intents/board, Pi realm (separate token) | Shells, secrets, infrastructure |
| **Boss agent** | *Not found in any repo I can see.* Needs a definition (see §6). | — | — |

**Retire the name "Heisenberg."** Today "Heisenberg" is only a system prompt on a single chat
completion (Hermes `starnet_gateway.py`) or a single `/api/run` (StarNet `gateway/server.js`). It
doesn't decompose or dispatch. Rename the route `/v1/heisenberg/tasks` → `/v1/intents`, and
keep the old path as an alias for one release.

**Fix Pi's identity.** `pauli-pi-agent/PAULI.md` says Pi is "PAULI, the company librarian". The
Command Center calls Pi "Jeremy", and the adapter backs it with "Cosmos" + "Jarvis". Pick one name, and
rewrite `PAULI.md` as a personal-lane charter: no company folders, no business keys.

### Pi's protected lane: what "sealed" means in practice

- A separate bearer token (`PAULI_PI_AGENT_API_KEY`). It must never fall back to any other token
  (today the StarNet client falls back to Terabithia's, so the same bug class exists; see C3).
- Its own data dir (`/var/lib/pauli-pi/`), with an OS user that can't read `/opt/pauli-effect/*`.
- Its tool allowlist is only personal read connectors. Any write (a payment, a booking, a message) is a
  decision card for you, never automatic.
- It gets no Hermes dispatch tool and no WhatsApp fleet channel. It talks to you, full stop.
- Command Center `/pi` stays behind the owner session **with no open-access bypass** (see C1).

## 3. Instinct ↔ Hermes failover

The goal: when Instinct is down, Hermes steps up with the same information.

The mechanism fits in one table:

| Piece | Where it lives |
|---|---|
| Board (shared memory) | Hermes `GET /v1/board`. Instinct *writes* to it through `POST /v1/board/answers`. No local file. |
| Heartbeat | Instinct `POST /v1/heartbeat` every 60 s |
| Takeover rule | Hermes watcher: no heartbeat for 5 min → Hermes' own WhatsApp adapter (`gateway/platforms/whatsapp.py`, already in the Hermes repo) starts answering, prefixed "Hermes here, Instinct is offline". Heartbeat returns → Hermes goes quiet. |
| Same answers | Both read the same board and send the same `/v1/intents`, so the takeover doesn't lose context |

This is a watcher script plus a flag, not an agent. That follows firstmate's rule: *scripts own the
mechanics, agents own the judgment.*

## 4. Bugs found (verified by reading the code; G1 reproduced)

Severity: **S1** = security or false state, **S2** = broken feature, **S3** = cleanup.

### StarNet gateway — `gateway/server.js` (fixed in this PR)

| # | Sev | Bug | Fix |
|---|---|---|---|
| G1 | S1 | **Any unauthenticated request with a bearer longer than 64 chars killed the gateway.** `timingSafeEqual` threw on unequal lengths, the async handler rejected, and Node exited. Reproduced: `ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH`, process gone. | Hash-then-compare (`tokenMatches`). Test: `test/gateway-hardening.test.js`. |
| G2 | S1 | **Approvals were fake.** The sidecar has no `/api/approve`, so every decision fell into the catch and returned `200 ok:true "recorded at gateway"` while recording nothing. | Returns `501 APPROVAL_SEAM_NOT_WIRED, ok:false`. |
| G3 | S1 | Every roster agent was reported `status: 'online'`, but a roster row isn't a heartbeat. | `status: 'unknown'`, `active: null`. |
| G4 | S2 | A caller could pass `context.key` and run on any provider account. | Keys come only from gateway env. `key` is stripped from the forwarded context. |

### StarNet gateway: still open

| # | Sev | Bug |
|---|---|---|
| G5 | S2 | `STARNET_WORKSPACE_PATH` defaults to Windows `~/AppData/Roaming/...` (`server.js:344`, `city-world.js`). On the Linux VPS that path doesn't exist, so the roster and world are silently empty. Make the variable required on non-Windows, or log loudly. |
| G6 | S2 | `getCityStatus` calls `/api/status`, which doesn't exist on the sidecar. It always falls back to `/api/health`, so `sidecarData` is always `{}` and districts are always the synthetic "City Center". Same with `agent.pending.json`: nothing writes it, so approvals are always `[]`. |
| G7 | S2 | The task store is in memory. A restart loses every receipt, which breaks acceptance item 6 ("survives restart"). |
| G8 | S3 | The rate-limit map is never pruned, so memory grows by one entry per IP. |

### Two gateways for one contract (biggest simplification)

`/v1/city/status`, `/v1/heisenberg/tasks` and `/v1/approvals/:id/decision` are implemented
**twice**, differently:

- `pauli-starnet/gateway/server.js` (Node, async 202 + poll, `/api/run` with tools)
- `pauli-hermes-agent/starnet_gateway.py` (FastAPI, **sync** 90 s chat completion, no tools)

Bugs specific to the Hermes copy:

| # | Sev | Bug |
|---|---|---|
| H1 | S1 | `city_status` hardcodes `status: "online"`, `districts: []`, `missions: []`, `approvals: []` (`starnet_gateway.py:159-160`). The Command Center shows an empty city while StarNet has districts. |
| H2 | S1 | The gateway token falls back to `TERABITHIA_API_KEY`, then `HERMES_API_KEY` (`:49`). One leaked key opens three planes. |
| H3 | S2 | `POST /v1/heisenberg/tasks` blocks up to 90 s (`:215`). The Command Center's poll loop never runs, and serverless requests hang. |
| H4 | S2 | "Heisenberg" is a single chat completion with no crew dispatch. The first-mate claim isn't backed. |

**Decision to make:** keep **one** gateway. The recommendation is the Hermes-mounted one (Hermes is
the first mate and already fronts `api.thepaulieffect.com`), rebuilt on the Node version's logic
(async 202 + poll, truthful failed status, tools on the wire). Then delete the other.

### Command Center — `pauli-command-center`

| # | Sev | Bug |
|---|---|---|
| C1 | **S1** | `COSMOS_OPEN_ACCESS=1` (added 2026-09-16, `src/middleware.ts:48`, `cosmos/security/auth.ts:77`) turns off **all** auth, including `/api/computers/[id]/exec`, which runs **arbitrary bash on Orgo computers**, plus `/api/secrets` and `/pi`. If that env var is still set, anyone with the URL has a remote shell. **Check Coolify today.** Delete the bypass. |
| C2 | S1 | The middleware accepts the raw `COSMOS_ACCESS_TOKEN` as a cookie value (`middleware.ts:85`, `session === expected`) and compares it without constant time. The auth.ts version correctly doesn't. |
| C3 | S1 | The StarNet client falls back to `TERABITHIA_API_KEY` (`src/lib/starnet-control-plane.ts:12,15`). That's the same "authority drift" the 08-29 audit fixed (#8), now back on a different plane. |
| C4 | S2 | `starnetConfigured()` is always true because the URL has a hardcoded default, so the "not configured" branch in `/api/starnet/status` is dead code. |
| C5 | S2 | The Heisenberg poll waits 20 s (`:72`). The 08-29 audit bounded this to 8 s for serverless (#9). |
| C6 | S3 | There are two chat paths (`/api/chat` → Terabithia → Hermes, and `/api/starnet/chat` → Heisenberg) plus Pi chat, so three task clients do the same thing. Collapse them into one `/v1/intents` client. |
| C7 | S3 | The owner UUID is hardcoded as a default in two files. |

### Instinct voice bridge — `instinct-voice-agent`

| # | Sev | Bug |
|---|---|---|
| I1 | **S2** | **The Dockerfile copies only `agent.py`**, but `agent.py` imports `handoff`, so the container crashes on start with `ModuleNotFoundError`. The `instinct_vision_agent.py` bridge (the "brain swap") isn't in the image at all. |
| I2 | S2 | `agent.py` defines `_jev_run`/`_use_computer_impl` twice (`:36` and `:73`) and the `use_computer` tool twice (`:120`, `:125`). This is a paste accident; the second definition silently wins. |
| I3 | S1 | `use_computer` drives a real browser (it can "click, fill") with no approval gate. That's fine for reading, but a voice mishear can submit a form. Make it read-only, or require a spoken "confirm". |
| I4 | S1 | The only phone auth is SIP caller ID (`PAULI_ALLOWED_CALLERS`), and caller ID can be spoofed. Add a spoken PIN before any action tool. |
| I5 | S2 | `ask_instinct` matches any shared word longer than 4 letters (`instinct_vision_agent.py:151`). "What's the status of the server" can return a stale unrelated answer. Match on answer `id`, not on keywords. |
| I6 | S2 | The board is a local file path (`/root/pcc-livekit/voice-agent/board.json`), so voice only works on that one box. Read it from Hermes `/v1/board` instead (§1 rule 2). |
| I7 | S3 | The persona name drifts: the phone agent is "Pauli", the room agent is "Instinct", and the README says "Pauli Phone". |

## 5. Delete list (simpler = better)

1. One gateway, not two (§4).
2. One intent endpoint (`/v1/intents`), not three task clients (Terabithia/Hermes, StarNet/Heisenberg, Pi).
3. One board served over HTTP, not a file on one box.
4. One name per agent: Hermes (first mate), Instinct (voice/WhatsApp), Pi (personal). Retire Heisenberg.
5. One token per plane with no fallback chains: Command Center→Hermes, Hermes→StarNet, Command Center→Pi.
6. `COSMOS_OPEN_ACCESS` removed.
7. Legacy Command Center routes that the UI no longer uses (08-29 audit #16: GitHub/image/connections mutations): delete them.

## 6. Open questions for the owner

1. **Boss agent:** which repo? I found none named boss/chief/ceo among repos this session can list.
2. **Command Center URL and the 3D graph URL:** the only graph in the repos is
   `pauli-pi-agent/agent-graph.html`, a static D3 **2D** graph with hardcoded nodes (not live state).
   If the 3D graph is deployed somewhere else, send the link.
3. **Instinct runtime:** the WhatsApp side of Instinct (the "fleet watcher" that writes `board.json`)
   isn't in `instinct-voice-agent`. Where does it live?
4. The skill you started to name ("Stand by…").

## 7. How the uploaded skills fit

| Skill | Use it for |
|---|---|
| **firstmate** | Hermes' operating model: one liaison, visible crew, disposable worktrees, zero-token watcher, `/bearings` digest = the board. Copy the *rules* into Hermes `AGENTS.md`; don't vendor the distro. |
| **caveman** + **rtk** | Token savings for every metered agent (Hermes supervision branch, StarNet lanes). Put rtk on the VPS for shell output. |
| **i-have-adhd** | Output shape for Instinct/Hermes → you: lead with the next action, one decision at a time, visible wins. This fits the board format. |
| **claude-video** (`/watch`) | Instinct/Hermes "watch this link" requests. |
| **media-gen**, **perfect-vfx** | Creative district crews. Always quote cost before a video render (media-gen principle 5 is already an approval gate). |
| **cinematic-site-components** | Web crews building client sites. |
| **ICM Awwwards Gauntlet** | The critic step before any client site ships (a builder can't approve its own work). Also good for a Command Center UI pass after the plumbing is fixed. |

## 8. Order of work

1. **Today:** confirm `COSMOS_OPEN_ACCESS` is unset in Coolify (C1). Deploy the gateway fixes in this PR (G1–G4).
2. Fix the Instinct Dockerfile + duplicate tool (I1, I2). It's a two-line change.
3. Pick one gateway, and move `/v1/board` + `/v1/intents` into it.
4. Heartbeat + Hermes WhatsApp takeover watcher.
5. Pi charter rewrite + token separation.
6. Delete list.
