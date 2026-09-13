# ARCHIVE BATCH 1 - IMPORT-CREDITED REPOS (review copy, nothing touched)

Status: PENDING OWNER SIGN-OFF. This manifest is a proposal only. No repository has been
archived, renamed, deleted, or otherwise modified. Per districts/pauli/CONTEXT.md, archives
happen per batch and only with Bambú's explicit sign-off on that batch.

## What "archive" means here

GitHub repository archive: the repo becomes READ-ONLY. Nothing is deleted - all code, history,
issues, and releases stay visible and downloadable, and archiving is REVERSIBLE at any time from
the repo settings. No content is lost by archiving. Deletion is not on the table in any batch.

## Why these five first

Batch 1 is the set of IMPORT-then-archive repos whose import credit is now EARNED: everything the
census (2026-09-12) marked as their take has been ported into pauli-starnet, pinned to the source
SHA, covered by tests, and credited in their IMPORT.md. Archiving them is verifiable: for each
repo below, the preservation proof names the landed file, the upstream commit, and the test count.
Batches 2+ will cover the ~92 pure-ARCHIVE repos (standalone upstream forks, domain tools, skill
packs, UIs, experiments), grouped by theme, each with its own sign-off.

## The batch

| Repo (all under executiveusa) | License | Last activity | Take (census) | Preservation proof in pauli-starnet | Gate |
|---|---|---|---|---|---|
| [pauli-firstmate](https://github.com/executiveusa/pauli-firstmate) | MIT (upstream kunchenguid/firstmate @ 0e31b0a0) | 2026-09-12 | supervision patterns: worktree isolation, dispatch profiles, second mates, durable status, reset/stow lifecycle | `sidecar/supervisor.js` + `test/supervisor.test.js` (34 assertions), landed upstream @ `b291a6f`; `districts/pauli/imports/firstmate/` holds IMPORT.md + retained LICENSE-UPSTREAM | LANDED - ready |
| [pauli-OpenChronicle](https://github.com/executiveusa/pauli-OpenChronicle) | MIT (upstream Einsia/OpenChronicle @ d780c62d) | 2026-05-07 | screen/app-context capture into inspectable local memory (watcher-memory adapter) | `sidecar/pauli-memory.js` + `test/pauli-memory.test.js` (31 assertions), landed upstream @ `1eaa75c`; IMPORT.md + LICENSE-UPSTREAM retained. Open follow-on (does not block archive): separate-process MCP exposure | LANDED - ready |
| [pauli-waku-agent](https://github.com/executiveusa/pauli-waku-agent) | MIT (upstream ShenSeanChen/waku-agent @ 8328f567) | 2026-08-18 | legible loop, semantic/episodic/procedural memory tiers, consolidation gate, evals | same `sidecar/pauli-memory.js` chunk (tiers + gate + stale-flagged recall), upstream @ `1eaa75c`; IMPORT.md + LICENSE-UPSTREAM retained. Open follow-on (does not block archive): eval dataset port | LANDED - ready |
| [pauli-multiplayer-ai](https://github.com/executiveusa/pauli-multiplayer-ai) | MIT (upstream yc-software/qm @ 6deb7c2a) | 2026-08-14 | room/user-scoped sessions: per-participant keychains, permissions, file scoping, work queue | `sidecar/pauli-council.js` + `test/pauli-council.test.js` (65 assertions); IMPORT.md + LICENSE-UPSTREAM retained | patch delivered, pending Watcher - archive only after it lands upstream |
| [paperclip-pauli-clip](https://github.com/executiveusa/paperclip-pauli-clip) | MIT (upstream paperclipai/paperclip @ 300c54c3) | 2026-08-08 | orchestration registry for agents/tools with provenance | `sidecar/pauli-registry.js` + `test/pauli-registry.test.js` (37 assertions); IMPORT.md + LICENSE-UPSTREAM retained | patch delivered, pending Watcher - archive only after it lands upstream |

All five ports are dependency-free sidecar modules (ambient I/O injected, fail-open storage),
registered in `test/fast.list`, and verified green on fresh clones alongside the existing suite
(cityos 47 assertions, city-web 138, pauli-district-port, financial-district-port - no regressions).

## Explicitly NOT in this batch

- PAULIS-PLACE - canon imported (vision, ICM docs, COUNCIL.md) but still being mined (Mission
  Control, Compute provider, factories). Archive candidate once remaining imports conclude.
- pauli-studio-control-plane - canon imported; its Paperclip registry reference was used in the
  chunk 4 port. Archive candidate in a later batch.
- pauli-agent-orchestrator - import spec written, port not yet started. Not archivable.
- pauli-agent-S-computer-use- - deferred to the ComputerProvider chunk (Apache-2.0, adapter route).
- pauli-vibe_cockpit - NOASSERTION license (license law: STOP). No import possible; its archive
  decision rides with the observability-ideas question, separate batch.
- pauli-Agentshire, pauli-pixel-agents, pauli-paulisworld-openclaw-3d - deferred to the graphics PRD.
- pauli-berd - deferred to the ComputerProvider chunk.
- All 8 KEEP repos (pauli-starnet, pauli-tars-demo-, pauli-hermes-agent, pauli-command-center, ...).

## Sign-off request

Bambú: approve batch 1 and the Watcher archives exactly the repos in the table whose gate reads
LANDED - and the two gated repos only once their patches land upstream and re-verify green.
Anything you want pulled out of the batch stays put, no questions asked.
