# IMPORT SPEC - pauli-multiplayer-ai (council session layer)
Source: executiveusa/pauli-multiplayer-ai @ 6deb7c2a698aa7449c0d4d32b986f3a52937555d (main)
Upstream: yc-software/qm | License: MIT (LICENSE-UPSTREAM retained)

## Take (file-pinned at source SHA)
- Room/user-scoped session model: rooms with per-user keychains, permissions, file scoping, work queue, sandbox abstractions (see repo docs + src layout at pinned SHA).

## Destination
- PAULI'S PLACE council sessions: the LLM-council venue needs multi-agent room sessions with per-participant permissions and a scribe-owned minutes ledger. Adapter interface: CouncilRoom.open(participants[], policy) -> session; close -> minutes receipt to mission ledger. Pairs with canon/paulis-place/COUNCIL.md (adversarial 3-turn debate protocol).

## Tests
- Session isolation test (participant A cannot read B's keychain), queue ordering test, minutes-receipt emission test.

## Archive credit
Counts as pauli-multiplayer-ai's import record once council sessions run.
