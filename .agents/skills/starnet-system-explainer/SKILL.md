---
name: starnet-system-explainer
description: "Map, explain, audit, and improve StarNet using source-grounded architecture diagrams plus audience-calibrated explanations. Use for architecture questions, onboarding, system maps, flows, capability boundaries, trust boundaries, proposed refactors, and requests to explain how StarNet works. Uses Archify when available and the local ELI5 skill for the explanation layer."
---

# StarNet System Explainer

This skill exists to make StarNet understandable **without inventing topology** and to turn understanding into small, verifiable improvements.

## Non-negotiable StarNet truths

Before proposing changes, inspect the current repository and verify the facts. Treat these repository contracts as authoritative unless current source disproves them:

- The station is a projection of live runtime state, not decorative fiction.
- A room represents a capability-scoped team.
- A hallway represents an authorized handoff lane.
- A placed object represents a real capability grant.
- The frontend must not assert runtime state the harness cannot prove.
- Secrets belong to the local authority (sidecar / OS keychain), never the frontend.
- `shared/` is an additive-only cross-boundary contract unless explicitly approved otherwise.
- Prefer isolated changes over edits to known hotfiles, especially `sidecar/index.js`.

Start by reading:
1. `README.md`
2. `CODE_MAP.md`
3. `docs/BRAIN.md` when present
4. Only the source files required to answer the specific question

Do not infer runtime behavior from names alone.

## Archify integration

Archify is the preferred renderer for system explanations because it supports typed, validated architecture, workflow, sequence, data-flow, and lifecycle diagrams.

### Ensure it is present

If `.agents/skills/archify/` is missing and shell access is available, install it **only in this repository**:

```bash
npx -y skills add tt-a1i/archify --skill archify --agent codex --copy --yes
```

Do not use a global install for repository automation unless the human explicitly asks for one.

If shell access is unavailable, continue with a text map and clearly state that the visual artifact was not generated.

### Pick the diagram by question

- `architecture` — components, services, storage, trust/capability boundaries
- `workflow` — recipes, approvals, handoffs, release/QA procedures
- `sequence` — one request or agent/tool interaction over time
- `dataflow` — secrets, prompts, transcripts, memory, provider traffic, PII
- `lifecycle` — task/run/agent/deployment states, retries, waits, cancellation

Prefer 8–12 core nodes for a high-level map. Put supporting detail in cards/notes instead of adding edge clutter.

### Evidence rules

For repository-backed diagrams:
- Pin source evidence to the exact revision when Archify supports it.
- Use exact source ranges only after checking them.
- Never claim that an edge exists merely because two modules both exist.
- Separate **authored topology** from **runtime proof**.
- A diagram validation pass proves diagram consistency, not production behavior.

## Explanation layer

After producing or inspecting the map, use the local `eli5` skill to explain it at the requested audience level.

Default StarNet explanation order:

1. **What it is** — one sentence.
2. **Mental model** — station analogy mapped to real execution boundaries.
3. **Primary path** — user/channel → frontend/sidecar → agent loop → provider/tools → persistence/events → UI/output.
4. **Authority boundaries** — where capabilities, permissions, secrets, and consent live.
5. **Proof boundary** — what StarNet can actually verify versus what is only planned/configured.
6. **So what** — why the architecture matters for the user/operator.

For non-technical audiences, do not remove the proof boundary; simplify it.
For engineers, include trade-offs, coupling, hotfiles, persistence, and test gates.
For product/business audiences, translate architecture into reliability, cost, safety, operator control, and shipping risk.

## Improvement workflow

Never jump from a diagram directly to a rewrite.

### 1. Baseline
Record the current behavior and current proof:
- relevant tests/gates
- current source revision
- current architecture map
- current ownership boundary

### 2. Find one architectural pressure
Examples:
- too much responsibility in a hotfile
- unclear authority boundary
- duplicated persistence or event translation
- UI showing state not backed by an event/receipt
- capability grant not visibly tied to enforcement
- hard-to-explain flow caused by unnecessary coupling

### 3. Define the smallest improvement
Specify:
- measurable outcome
- affected files
- forbidden blast radius
- migration/backward-compatibility constraints
- rollback
- proof required

### 4. Compare before/after
When practical, use Archify's validated snapshots to show Before / Delta / After. A prettier diagram is not itself an improvement; the underlying system must become clearer, safer, simpler, or more verifiable.

### 5. Verify
Run the narrowest relevant tests first, then the repository-required gate before merge. For StarNet, `npm run test:fast` is the normal merge gate unless current repository documentation says otherwise.

Never claim production readiness from a build, diagram validation, or deployment request alone.

## Standard deliverable

For architecture work, return:

- **MAP** — artifact or concise text topology
- **EXPLAIN** — audience-calibrated explanation
- **FINDINGS** — facts vs assumptions
- **IMPROVEMENT** — one bounded change with commercial/operator value
- **PROOF** — exact evidence required
- **RISK** — blast radius and failure mode
- **ROLLBACK** — how to undo it
- **NEXT** — single next action

## Quality bar

The result should make a new operator understand StarNet faster **and** make an experienced engineer less likely to break its authority model.
