# STARNET — Pauli Control Plane Slice 1

Status: SPECIFIED / BLOCKED ON SHARED-PLATFORM PROOF
Mode: brownfield
Branch: `pauli/control-plane-slice-1`

## Outcome

Prove that STARNET can display one real Pauli project, one real agent/worker and one real sandbox mission from the shared control plane without inventing runtime state.

## Target

Owner/operator using STARNET as a visual observability surface while Command Center remains the canonical owner cockpit.

## Commercial value

This is the smallest verifiable step toward the Sovereign AI Office promise: an owner can see a real cloud worker operating on a real project, with the same truth visible in both Command Center and STARNET.

## Dependencies

Do not move this slice into runtime integration until these candidate changes are green and independently reviewed:

- `executiveusa/pauli-orca-` PR #4 — truthful Orca factory gateway;
- `executiveusa/terabithia` PR #18 — real Orca-backed coding-session state;
- `executiveusa/pauli-command-center` PR #23 — canonical owner-control authority lock.

A merged PR is not sufficient cloud proof. The worker-host smoke must still demonstrate real Git + Orca command receipts for one harmless sandbox preparation.

## Authority

```text
Command Center = owner command/approval cockpit
Hermes         = First Mate / orchestration
Terabithia     = fleet + infrastructure control plane
Orca           = coding workspace / worker execution
Supabase/Pauli = durable mission/evidence state
STARNET        = truthful visual projection
GitHub         = source + branch/commit/CI authority
```

STARNET must not become another orchestrator.

## Existing STARNET boundaries to preserve

The current harness has one Node sidecar serving HTTP/SSE and the frontend. The browser consumes sidecar events. `shared/` is an additive-only event/schema contract. Keep those boundaries.

Do not wire the frontend directly to Terabithia, Hermes, Orca or secret-bearing infrastructure endpoints.

## Slice architecture

```text
Terabithia / Pauli read surface
        |
        v
sidecar/control-plane/pauli-client.js
        |
        v
sidecar/control-plane/normalize.js
        |
        v
additive frozen event payload
        |
        v
U.bus / SSE
        |
        v
existing frontend state spine
        |
        +--> one project indicator
        +--> one worker/agent indicator
        +--> one sandbox mission indicator
```

The sidecar owns authentication to the private control plane. No private token crosses into frontend JavaScript or browser storage.

## Minimum normalized record

```json
{
  "source": "pauli-control-plane",
  "observed_at": "2026-09-04T00:00:00Z",
  "project": {
    "id": "...",
    "repo": "owner/name",
    "status": "unknown|idle|working|blocked"
  },
  "worker": {
    "id": "...",
    "name": "...",
    "status": "unknown|idle|working|blocked|waiting_approval",
    "heartbeat_at": null
  },
  "mission": {
    "id": "...",
    "status": "unknown|queued|running|blocked|waiting_approval|verified",
    "sandbox_state": "unknown|unavailable|blocked|ready|running|failed",
    "branch": null,
    "latest_verified_sha": null
  }
}
```

Unknown or missing source data stays unknown. Do not translate absence into `idle`, `online`, `complete` or `$0`.

## Visual contract

For this first slice, reuse the existing station instead of redesigning it.

- One existing project/work area receives the project state.
- One existing agent/crew body receives the worker state.
- One existing workstation/prop receives the sandbox mission state.
- Motion/state changes occur only from normalized backend events.
- `ready` means workspace prepared, not mission complete.
- `verified` requires acceptance evidence from the control plane.
- No decorative fake terminals, fake progress, fake cost, fake commits or fake activity.

## Security constraints

- Server-side control-plane base URL and token only.
- No credentials/cookies in durable STARNET memory or frontend save state.
- Timeouts on control-plane reads.
- Read-only integration in Slice 1.
- If the control plane is unreachable, emit `unavailable`; do not reuse stale state as current without an explicit stale marker.
- No direct production/deploy/cancel/message action from this slice.

## Tests before implementation can be called verified

1. Normalizer maps a fully populated fixture deterministically.
2. Missing heartbeat remains unknown/no-heartbeat.
3. Missing mission data does not become completed/idle.
4. Control-plane timeout emits unavailable/degraded state.
5. Secret/token never appears in normalized payload, SSE event, log fixture or frontend storage.
6. Same normalized event produces deterministic UI state.
7. Existing `npm run test:fast` remains green.
8. Relevant HTTP test proves the sidecar endpoint/event is real and authenticated server-side.

## End-to-end proof

Run one harmless real sandbox preparation through:

```text
Command Center/Hermes -> Terabithia -> Orca -> sandbox
```

Then capture:

- Terabithia mission/coding-session response;
- Orca command receipts;
- STARNET sidecar normalized response/event;
- STARNET screenshot showing the same project/worker/mission state;
- candidate SHA;
- timestamp;
- any material console/network failures.

The screenshot alone is not proof.

## Rollback

The first slice is additive and read-only. Rollback is removal/revert of the Pauli control-plane client, additive event/schema entry and UI projection. Existing local-first STARNET agent runtime remains unchanged.

## Stop conditions

Stop and report `BLOCKED` if:

- the Orca/Terabithia shared-platform candidates are not green;
- the cloud worker does not produce real command receipts;
- control-plane auth would require exposing a token to the browser;
- implementing this requires replacing the STARNET sidecar/event spine;
- source state cannot be distinguished from synthetic/demo data.

## Next implementation ticket

After dependency proof passes: add the read-only sidecar Pauli control-plane client + normalizer + tests. Do not touch world art or animation until that data path is verified.
