# Adapter boundary

The normalizer uses strict source and payload allowlists, content-derived identities, verified hashes, recursive numeric/privacy/money checks and source-bound evidence. Historical inputs remain explicitly `shape-only`. Live inputs require an exact pinned URL, no redirects, validated request metadata, response-byte hash, receipt-derived time, and byte-body-to-event-payload equality.

The capture script records the actual outgoing request-header map and the validator confirms no Authorization header was sent. The receipt writer is private to the module, not exported. Local receipts are auditable byte-consistent captures, not external signatures; see `contract.md` for the residual trust boundary.

A future server-side exporter should emit signed, sanitized records. Pauli must never hold the bridge credential.
