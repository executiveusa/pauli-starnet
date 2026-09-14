---
name: gauntlet-loop
description: Turn a concrete benchmark into an iterative build-versus-critic loop. Use when a named, fetchable, comparable reference exists and the goal is to improve a product until an independent critic prefers the challenger on the stated dimensions.
---

# Gauntlet Loop

Adapted from the owner-supplied Gauntlet Loop skill (CC BY 4.0). Attribution: robonuggets/gauntlet-loop.

## Contract

1. Lock a named, fetchable, comparable bar before building.
2. Break the target into the smallest testable pieces.
3. The builder never grades its own work.
4. Use a separate critic with fresh context whenever StarNet orchestration is available.
5. Compare challenger vs reference directly on the same task and viewport/context.
6. Prefer a binary verdict — challenger wins / reference wins / unverified — over self-awarded numeric scores.
7. Fix the highest-impact defect first, then rerun.
8. Do not use a fixed number of rounds. Stop only when the acceptance contract is met or a real blocker is proven.
9. If the benchmark cannot be inspected, mark that dimension UNVERIFIED instead of guessing.

## Web / product benchmark procedure

For each round:

- State the dimension being tested: e.g. time-to-first-value, conversion clarity, workflow coherence, mobile hierarchy, interactive control, throughput, trust, or evidence loop.
- Capture the current challenger evidence from the real app or source.
- Capture the same evidence from the benchmark.
- Give both to an independent critic without telling it which one the builder prefers.
- Require the critic to pick one and name the three defects that most affected the decision.
- Patch only the smallest slice needed to address those defects.
- Re-run existing tests and the direct comparison.

## MaxFusion rule

When MaxFusion is the benchmark for Buffer Blaster, compare observable product behavior and outcomes rather than copying proprietary design, copy, or implementation. Relevant dimensions include:

- immediate useful action from the first screen
- research/reference → concept → generation workflow coherence
- visual flow/canvas control
- storyboard/continuity before spend
- batch production throughput
- editing/composition path
- agent/API/MCP usability
- evidence/performance feedback loops
- mobile clarity

Buffer Blaster's spend gates, human approvals, evidence receipts, and provider-neutral architecture are constraints to preserve, not defects to remove.

## Capability routing

- Benchmark research needs `dish`.
- Durable findings/skill updates need `notebook`.
- Visual/media inspection needs `studio` when applicable.
- Independent delegated critic requires the lead to have `orchestrator`.
- Missing capability is a blocker, never permission to claim the work happened.

## Output

Return:

- benchmark locked
- challenger evidence
- critic verdict
- top three defects
- smallest next slice
- proof run
- remaining unverified dimensions
