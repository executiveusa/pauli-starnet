# Pauli's Place City OS

**Status:** Chunk 1 implementation contract — CitySpec v2

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

## Default city — nine districts

CitySpec v2 contains nine districts:

1. **Command** — owner intent, Heisenberg orchestration, approvals, mission board.
2. **Production** — software delivery and Pi agent foundry.
3. **Revenue** — opportunities, qualified prospects, audits, pricing/economics.
4. **Impact** — nonprofit/social-purpose fundraising readiness, relationship cultivation, stewardship, compliance/eligibility review.
5. **Creative** — design, writing, marketing, publishing, media assets.
6. **Commerce** — products, listings, SEO, commerce operators, connector exchange.
7. **Intelligence** — research, monitoring, analysis, curation, durable memory.
8. **Experiment** — evidence-driven tests, challengers, QA, optimization.
9. **Operations** — unattended queues, supervision, deterministic operations and change watches.

First-wave building templates:

- Heisenberg HQ
- Software Factory
- Pi Agent Foundry
- Revenue Center
- Impact HQ
- Stewardship House
- Creative Studio
- Commerce Factory
- Connector Exchange
- Intelligence Center
- Memory Archive
- Experiment Lab
- Night Operations

The compiler lays these out deterministically to the east of the existing starter station, connects them with corridors, supplies real capability props, gives every assigned agent a dedicated compute workstation, stamps physical inbox/bay/outbox workflows, and leaves unfilled roles visible as vacancies.

## Impact District

Impact is a first-class district rather than a separate orchestrator. It reuses native specialties and routes cross-district work when another department owns the capability.

### Impact HQ

Default slots:

- `strategist` — owns the fundraising/impact plan and chooses the smallest useful next move.
- `envoy` — owns relationship cultivation and partner/funder communication planning.
- `paralegal` — owns eligibility, fiscal-sponsor, rights/compliance and document-risk review; never substitutes for licensed legal advice.
- `pitchwriter` — owns the evidence-backed one-page case for funding and proposal/case drafts.

### Stewardship House

Default slots:

- `registrar` — relationship/contact record quality, history, next-touch state.
- `negotiator` — prepares terms and conversations when a real relationship reaches that stage.
- `closer` — prepares a supported ask/commitment path only after cultivation evidence exists; no autonomous outbound ask.
- `ghostwriter` — relationship-aware drafts in the organization's actual voice.

The district's bundled mission workflow is `impact-fundraising-cultivation`. It is `default: false`: Heisenberg invokes it only for an active nonprofit/social-purpose fundraising, funder, stewardship, grant-readiness or case-for-funding mission. It must not run continuously merely because the district exists.

Cross-district delegation:

- Intelligence → current funder/program research and evidence.
- Revenue → opportunity/prospect priority and unit economics.
- Creative → campaign story, design and media.
- Production → donation/volunteer funnels and digital deliverables.
- Commerce → governed payment/distribution connectors.
- Experiment → measured message/funnel tests after a baseline exists.
- Operations → approved follow-up schedules and internal reminders.
- Command → mission decomposition, evidence reconciliation and owner approvals.

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

The city remains inside the existing `WorldModel` 240x240-tile span guard. The compiler must prove scale and rendering behavior before that brownfield safety limit is reconsidered.

## Revenue-producing lanes represented in the city

1. **Agency Audit / Revenue Capture** — evidence-backed Client Presence Audit → strategy → deliverable/proposal staging → monthly measurement. SMB, social-purpose and nonprofit use the same pipeline with different weighting.
2. **Actor Productization** — evidence-backed niche research → Apify Actor build/test → approval-gated public listing → actual Store Insights read-back.
3. **POD Commerce** — governed Printify → unit-economics → Etsy staging/publishing path after provider/shop readiness is proven.
4. **Impact / Fundraising Readiness** — competence pack → warm-network map → funder map → case for funding → one focused campaign → stewardship plan; external asks/submissions stay approval-gated.
5. **Publishing / Books** — remains a first-class cross-district workforce lane rather than another physical district.

Consequential external actions remain approval-gated by STARNET's existing capability/consent system.

## Next chunks

### Chunk 2 — Population + Pi Foundry

Resolve city vacancies against native specialties first. Only demonstrated capability gaps may trigger a Pi-agent design/build/evaluate/promote cycle.

### Chunk 3 — Workflow City

Turn the building templates into production business blueprints with measurable inputs, outputs, routing, budgets, evidence, and approval gates. The operational routing/cadence lives in `docs/PAULIS_PLACE_CITY_OPERATING_PLAN.md`.

### Chunk 4 — Experiment / learning system

Create governed A/B tests with explicit hypothesis, baseline, challenger, metric, sample/cost budget, guardrails, evidence, decision rule, promotion/rollback, and retained learning. Self-improvement must be evidence-driven, not uncontrolled self-mutation.