# StarNet v1: contracts (one home for every message shape)

Existing shapes are quoted from `terabithia/bridge/fleet/contracts.ts` and must not be forked.
New fields are marked **new**.

## 1. Intent (front door → Terabithia) — `POST /api/v1/intents`

`CreateMissionInput` exactly as defined in `terabithia/bridge/fleet/engine.ts:7`. No new fields; the only
additions are new *values*: route `city`, agent `starnet`, sources `instinct` and `command-center`.

```json
{
  "intent": "Heisenberg, get me a three-point brief on <topic>",
  "route": "city",                    // optional; new route value
  "preferred_agent": "starnet",       // optional; set when the captain names Heisenberg
  "source": "instinct",               // new MissionSource value; also "command-center"
  "idempotency_key": "instinct:<call-id>:<turn>"
}
```

Auth: `Authorization: Bearer <caller key>`. Night-1 uses the shared `TERABITHIA_API_KEY`. Phase 4 gives
each caller its own key.

## 2. Mission envelope (Terabithia → StarNet gateway) — `POST /v1/missions`

The existing `MissionEnvelope`, with `target: "starnet"` (**new** `FleetAgentId`) and `route: "city"`
(**new** `FleetRoute`). The gateway accepts only `route: "city"` and a GREEN tier for Night-1. Anything
else returns `ResultEnvelope.status: "needs_human"` with a `HumanBlocker` and never runs.

## 3. Result envelope (StarNet → Terabithia)

The existing `ResultEnvelope`, filled like this:

- `agent_id: "starnet"`, `status: "done" | "failed" | "needs_human"`
- `summary`: Heisenberg's merged answer (plain words, ≤ 120 words for voice)
- `artifacts` (filled once the mission is `done` or `failed`; empty while `working`): one `EvidenceRef` per
  crew run (`type: "trace"`, `ref: "starnet://run/<run_id>"`) and one for the deployed commit
  (`type: "external_state"`, `ref: "git:<revision>"`). Source URLs (`type: "document"`) are not collected
  yet; that is a later phase, not a promise of this one.
- `evidence`: the same refs plus the foreman's own run
- **new** `crew: [{ agent_id, run_id, status }]`. Empty means solo work, and it must be reported that way (`solo: true`).

## 4. Sealed receipt (Terabithia store, mirrored by StarNet)

```json
{
  "receipt_id": "rcpt_<ulid>",
  "mission_id": "…", "trace_id": "…",
  "actor": "starnet/heisenberg",
  "tier": "GREEN",
  "approval_ref": null,
  "inputs_hash": "sha256:…",          // hash of the canonical MissionEnvelope
  "outputs_hash": "sha256:…",         // hash of the canonical ResultEnvelope
  "evidence": ["starnet://task/…", "https://…"],
  "revision": "<gateway commit>",
  "created_at": "…",
  "prev_hash": "sha256:…",            // hash of the previous receipt; the chain
  "hash": "sha256:…"                  // sha256 over canonical JSON of every field above
}
```

Canonical JSON = keys sorted, no whitespace, UTF-8. `signature` (Ed25519) is added in Phase 4.
Verification recomputes every `hash`, checks every `prev_hash` link, and checks the head anchor
(`<chain>.head`: count + last hash, rewritten on every seal), so cutting receipts off the end fails too.
Someone who can rewrite both files on the box is caught only by an off-box copy of the head (Phase 6 mirror).

One receipt per **outcome**: `done`, `failed` and `cancelled` are each sealed once. A failed mission the
captain resumes and that then ends again gets a second receipt; the chain keeps both. The board shows the latest.

## 5. Board (Terabithia → Instinct and Command Center)

`GET /api/v1/missions?limit=20` + `GET /api/v1/decisions`. Instinct maps them to its voice board:

```json
{ "summary": "2 done, 1 waiting on you",
  "items": [{ "mission_id": "…", "status": "done", "summary": "…", "receipt_id": "…" }],
  "decisions": [{ "id": "…", "title": "…", "why": "…", "resume_token": "…" }] }
```

A board item without `receipt_id` may show `working` or `failed`, never `done`.
