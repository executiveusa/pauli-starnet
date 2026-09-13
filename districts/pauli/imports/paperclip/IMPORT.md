# IMPORT SPEC - paperclip-pauli-clip (agent/tool registry)
Source: executiveusa/paperclip-pauli-clip @ 300c54c3a0e09f4def2441f753e87461d4bb2651 (master)
Upstream: paperclipai/paperclip | License: MIT (LICENSE-UPSTREAM retained)

## Take (file-pinned at source SHA)
- Registry concepts: orchestration registry for agents/tools with provenance (zero-human-company orchestration model). Pairs with studio-control-plane's Paperclip registry reference (canon/studio-control-plane/README.md).

## Destination
- Hall of Canon registry layer: one registry covering agents, skills, tools with provenance fields (source, SHA, license, review state) - extends the existing 370-skill registry pattern already in starnet.

## Tests
- Registry roundtrip + provenance-required validation test (entry without source SHA rejected).

## Status

PORT LANDED (chunk 4, 2026-09-13): sidecar/pauli-registry.js + test/pauli-registry.test.js (37 assertions) - one registry for agents/skills/tools with REQUIRED provenance (source + sourceSha + license; no-source-SHA entries rejected), draft -> reviewed -> canon ladder with reviewer trail, license law enforcement (NOASSERTION/none/AGPL on permanent hold out of canon), version-superseding re-registration with full provenance history, JSONL-replay persistence. Wiring starnet's existing 370-skill library into the registry remains open as a follow-on chunk.

## Archive credit
Counts as paperclip-pauli-clip's import record once the registry layer lands.
