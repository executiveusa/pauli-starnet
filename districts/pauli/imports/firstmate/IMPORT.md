# IMPORT SPEC - pauli-firstmate (supervision patterns)
Source: executiveusa/pauli-firstmate @ 0e31b0a06fd0cc93521ee118e5c31574003f4ccb (main)
Upstream: kunchenguid/firstmate | License: MIT (LICENSE-UPSTREAM retained, attribution required)

## Take (file-pinned at source SHA)
- `AGENTS.md` - the distro contract: identity + prime directives, hard rule 1 (read-only liaison boundary), merge-authority rules.
- `.agents/skills/decision-hold-lifecycle/`, `captain-hold-lifecycle/`, `ask-user-authority/` - hold/escalate lifecycle: escalate only real decisions, never silently guess.
- `.agents/skills/afk/`, watcher scripts - event-driven zero-token supervision: a bash watcher sleeps on the fleet and wakes the supervisor only when needed.
- Worktree isolation (`treehouse`), dispatch profiles (`no-mistakes` / `direct-PR` / `local-only`), second mates (isolated FM_HOME over SSH), durable on-disk status, reset/stow lifecycle.

## Destination
- districts/pauli/imports/firstmate/ (this spec + attribution)
- Pattern port target: sidecar supervisor module for PAULI'S PENTHOUSE (Pauli's watcher function over Hermes/Heisenberg workers). NEW code written against starnet interfaces, implementing these patterns - not a file copy.

## Tests
- Port lands with: dispatch-profile contract tests, hold-lifecycle state tests (hold -> escalate -> resume), watcher wake-on-event test. Pattern for test shape: repo's own docs/architecture.md.

## Status

PORT LANDED (chunk 1, 2026-09-13): sidecar/supervisor.js + test/supervisor.test.js (34 assertions) - dispatch profiles, hold lifecycle, durable status + reconcile, zero-token watcher, worktree naming. Not yet wired into sidecar/index.js routes - host wiring is chunk 1b.

## Archive credit
Counts as pauli-firstmate's import record; repo becomes archive-eligible after the supervisor port is verified.
