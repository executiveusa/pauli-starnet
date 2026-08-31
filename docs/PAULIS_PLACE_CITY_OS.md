# Pauli's Place City OS

**Status:** Chunk 1 implementation contract

**Product:** Pauli's Place

**Runtime:** STARNET remains the world, capability, consent, persistence, and agent-execution authority.

## Decision

Pauli's Place is compiled into STARNET's existing `WorldModel`; it is not a second world engine and it does not automate REFIT mouse clicks.

Heisenberg receives a small high-level city control surface. The compiler translates business intent into rooms, hallways, workstations, capability props, workflow machines, belts, agent bindings, connector portals, and pipeline edges using the existing validated model APIs.

Pi is the preferred foundry for a genuinely missing specialist only after the native STARNET specialty catalog has been checked. An empty building slot is represented as an honest vacancy rather than an invented agent.

## High-level city tools

- `city.inspect` — read the live city and capability topology.
- `city.plan` — compile a detached candidate city without changing the live station.
- `city.apply` — consent-gated; atomically replace the live station with the previously validated candidate document.
- `city.undo` — consent-gated; restore the exact pre-apply station only if no later world edit has made that rollback stale.

No tile-level build tools are exposed to the model in this slice.

## Compiler safety contract

1. Planning is detached and must not mutate the live station.
2. The draft is built through the existing `WorldModel` public mutation/validation surface.
3. The existing pipeline compiler validates generated workflow routing.
4. A prepared plan records the exact live-station signature it was based on.
5. Apply refuses a stale plan if the live station changed after planning.
6. Apply deserializes a fully validated candidate first, then swaps the live station's public runtime surface in one synchronous operation while preserving the station object identity held by `App` and `World`.
7. The exact prior serialized station is retained for one guarded rollback.
8. Undo refuses if the city has been edited since apply.
9. REFIT must be closed for city apply/undo so its active editor subscription cannot become stale.
10. The world renderer reloads after apply/undo and persistence must receive a durable read-back before an agent reports remote completion.

## First city

The default Pauli's Place plan contains eight districts:

1. Command
2. Production
3. Revenue
4. Creative
5. Commerce
6. Intelligence
7. Experiment
8. Operations

First-wave building templates:

- Heisenberg HQ
- Software Factory
- Pi Foundry
- Revenue Center
- Creative Studio
- Commerce Factory
- Connector Exchange
- Intelligence Center
- Memory Archive
- Experiment Lab
- Night Operations

The compiler lays these out deterministically to the east of the existing starter station, connects them with corridors, supplies real capability props, gives every assigned agent a dedicated compute workstation, stamps physical inbox/bay/outbox workflows, and leaves unfilled roles visible as vacancies.

## Capability law

The City OS never invents a second permission model. It uses the existing object-to-capability mapping in `worldmodel.js`:

- workstation -> compute
- cabinet/safe/vault/rack/shelf -> files
- dish/uplink/beacon -> web
- server/core/relay -> memory
- workbench -> terminal + verify
- studio -> image tools
- bound connector portal -> that connector's live tools

In shared rooms, compute remains per-agent; shared capabilities remain room-scoped exactly as the current model defines them.

## Current scale boundary

The first city remains inside the existing `WorldModel` 240x240-tile span guard. The compiler should prove scale and rendering behavior before that brownfield safety limit is reconsidered.

## Commercial lanes represented in the city

- **SELL:** Revenue Capture OS / Revenue Leak Map in the Revenue district.
- **USE:** Pauli's Place itself as the sovereign operating environment.
- **EXPERIMENT:** governed POD commerce, beginning with the already-defined Printify -> Etsy slice after provider readiness is proven.

Consequential external actions remain approval-gated by STARNET's existing capability/consent system.

## Next chunks

### Chunk 2 — Population + Pi Foundry

Resolve city vacancies against native specialties first. Only demonstrated capability gaps may trigger a Pi-agent design/build/evaluate/promote cycle.

### Chunk 3 — Workflow City

Turn the building templates into production business blueprints with measurable inputs, outputs, routing, budgets, evidence, and approval gates.

### Chunk 4 — Experiment / learning system

Create governed A/B tests with explicit hypothesis, baseline, challenger, metric, sample/cost budget, guardrails, evidence, decision rule, promotion/rollback, and retained learning. Self-improvement must be evidence-driven, not uncontrolled self-mutation.
