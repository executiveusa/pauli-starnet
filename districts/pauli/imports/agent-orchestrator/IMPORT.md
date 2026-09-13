# IMPORT SPEC - pauli-agent-orchestrator (parallel coding agents)
Source: executiveusa/pauli-agent-orchestrator @ 4cda43795bac02163a6094ed65d006ad0fd912c8 (main)
Upstream: Untrivial-ai/agent-orchestrator | License: MIT (LICENSE-UPSTREAM retained)

## Take (file-pinned at source SHA)
- Parallel coding-agent orchestration: worktree-per-task, branch/PR lifecycle, CI repair loop, reviewer-feedback loop, plugin layer.

## Destination
- Patterns doc for the Production district software factory + Pi foundry worker pools. Complements firstmate (supervision) - this is the parallel-execution half. No direct code copy; patterns implemented against starnet mission interfaces.

## Tests
- Worktree collision test (two workers, one repo), CI-repair loop test with a seeded failing build.

## Status

PORT LANDED (chunk 8, 2026-09-13): sidecar/pauli-foundry.js + test/pauli-foundry.test.js (34 assertions) - parallel worker pools: worktree-per-task with the collision law (distinct paths + branches per worker, duplicate workerId refused), CI repair loop (bounded attempts, honest exhaustion), reviewer-feedback loop, green-CI PR gate, isolated plugin hooks, JSONL event log. Patterns implemented against injected interfaces (git/runCi/repair/reviewer), no code copied - production binding of the git adapter to starnet's mission layer remains open.

## Archive credit
Counts as pauli-agent-orchestrator's import record once patterns land.
