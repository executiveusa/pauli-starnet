# IMPORT SPEC - pauli-multiplayer-ai (council session layer)
Source: executiveusa/pauli-multiplayer-ai @ 6deb7c2a698aa7449c0d4d32b986f3a52937555d (main)
Upstream: yc-software/qm | License: MIT (LICENSE-UPSTREAM retained)

## Take (file-pinned at source SHA)
- Room/user-scoped session model: rooms with per-user keychains, permissions, file scoping, work queue, sandbox abstractions (see repo docs + src layout at pinned SHA).

## Destination
- PAULI'S PLACE council sessions: the LLM-council venue needs multi-agent room sessions with per-participant permissions and a scribe-owned minutes ledger. Adapter interface: CouncilRoom.open(participants[], policy) -> session; close -> minutes receipt to mission ledger. Pairs with canon/paulis-place/COUNCIL.md (adversarial 3-turn debate protocol).

## Tests
- Session isolation test (participant A cannot read B's keychain), queue ordering test, minutes-receipt emission test.

## Status

PORT LANDED (chunk 3, 2026-09-13): sidecar/pauli-council.js + test/pauli-council.test.js (65 assertions) - room-scoped sessions with isolated per-participant keychains, FIFO work queue, the COUNCIL.md adversarial 3-turn debate protocol (per-role information gating, judge-model separation, halt -> escalate, locked-ruling contract saved to icm/memory/decisions/<date>/<debate_id>.json), hashed minutes receipt on close. Live model execution wiring (actually calling advocate/critic/judge workers) remains open for the Astra-lane chunk.

## Archive credit
Counts as pauli-multiplayer-ai's import record once council sessions run.
