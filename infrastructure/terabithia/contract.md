# Frozen contract

Source `executiveusa/terabithia@c4996f90b8c5e2d357076591f291ecd52f7596b0`.

Accepted event types: mission, result, evaluation, health. Every event has a content-derived ID, an allowlisted source, a strict per-type payload, source-bound evidence refs and a verified SHA-256 content hash. Unknown fields, free-text identifier channels, private/secret values, non-integer counts, nonzero cost and paid routes fail closed.

Verification levels:
- `receipt-bound` / `verified:true`: the normalized live payload exactly equals a validated captured response; time and event identity derive from that receipt.
- `shape-only` / `verified:false`: historical or fixture input passed schema/hash checks but its evidence was not independently resolved. It must never be called evidence-verified.

A local receipt proves only that this runner recorded these exact response bytes, request metadata and timestamp together. It does not cryptographically prove the external server's identity and is locally forgeable by a party with filesystem/code execution. TLS and the capture runner are residual trust assumptions. Consequential use needs a stronger signed/server-side provenance mechanism.

Mutation methods and bearer-token handling are absent from Pauli's adapter.
