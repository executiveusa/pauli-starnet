# IMPORT SPEC - pauli-waku-agent (memory loop concepts + evals)
Source: executiveusa/pauli-waku-agent @ 8328f567ab52d07921445cb40feed23cbc5ea2ad (main)
Upstream: ShenSeanChen/waku-agent | License: MIT (LICENSE-UPSTREAM retained)

## Take (file-pinned at source SHA)
- `docs/memory-backends-playbook.md` - backend comparison for semantic/episodic/procedural memory.
- `evals/` (deterministic suite: test_cli_memory.py, test_coding_eval.py, dataset.jsonl) - the eval harness shape for memory recall quality.
- Memory consolidation gate concept (from README + docs): promote short-term to durable only through a gate, never silently.

## Destination
- Pauli memory design for the Penthouse archivist: three-tier memory (semantic/episodic/procedural) + consolidation gate + eval harness ported as starnet tests. Concepts + eval shape; no wholesale file copy.

## Tests
- Port the deterministic memory evals against the Pauli memory implementation (same dataset shape, starnet harness).

## Status

PORT LANDED (chunk 2, 2026-09-13): sidecar/pauli-memory.js + test/pauli-memory.test.js (31 assertions) - 3-tier memory (episodic/semantic/procedural), provenance-required semantic writes, consolidation gate, stale-flagged recall, procedure versioning. Eval dataset port LANDED (chunk 7, 2026-09-13): sidecar/pauli-memory-evals.js + test/pauli-memory-eval.test.js - 7 deterministic cases pinning the recall contract and the fail-open law (a stale memory beats a lost one), with a teeth check: a memory that loses everything fails loudly. MCP exposure landed in the openchronicle import.

## Archive credit
Counts as pauli-waku-agent's import record once evals run green.
