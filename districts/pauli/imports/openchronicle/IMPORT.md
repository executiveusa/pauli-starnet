# IMPORT SPEC - pauli-OpenChronicle (watcher-memory adapter)
Source: executiveusa/pauli-OpenChronicle @ d780c62d049e6f14ba94c00862a663ccd7bf445d (main)
Upstream: Einsia/OpenChronicle | License: MIT (LICENSE-UPSTREAM retained)

## Take (file-pinned at source SHA)
- `docs/memory-format.md` + `docs/capture.md` - the inspectable local memory format and capture pipeline (screen/app-context -> structured memory).
- `src/openchronicle/capture/` (watcher.py, event_dispatcher.py, scheduler.py) - capture loop shape: watch, dispatch, schedule.
- `src/openchronicle/daemon.py` - long-running watcher lifecycle.
- `docs/mcp.md` - exposing memory over MCP.

## Destination
- Adapter behind Pauli's memory interface (Hall of Canon archivist + Penthouse watcher): PauliMemory.capture() / .recall(provenance=true). Runs as its own process; starnet talks to it over the documented MCP shape. No code lands in the starnet tree.

## Tests
- Memory-format roundtrip test (capture -> store -> recall with provenance), daemon restart-recovery test.

## Status

PORT LANDED (chunk 2, 2026-09-13): sidecar/pauli-memory.js + test/pauli-memory.test.js (31 assertions) - 3-tier memory (episodic/semantic/procedural), provenance-required semantic writes, consolidation gate, stale-flagged recall, procedure versioning. Separate-process MCP exposure LANDED (chunk 7, 2026-09-13): sidecar/mcp/pauli-memory-core.js (pure, read-only, call-first INSTRUCTIONS, 4 tools: stats/recall/recent/read-by-id drill-down) + sidecar/mcp/pauli-memory-serve.js (stdio edge) + test/pauli-memory-mcp.test.js (21 assertions incl. a spawned separate-process proof over pipes).

## Archive credit
Counts as pauli-OpenChronicle's import record once the adapter is running.
