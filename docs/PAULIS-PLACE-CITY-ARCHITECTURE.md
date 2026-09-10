# PAULI'S PLACE — Canonical StarNet City Architecture

Status: canonical architecture lock for the current `CityOS` v2 implementation.

Source of truth: `frontend/app/cityos.js` and its website mirror. This document does not create a second city manifest. It explains the architecture already implemented in CityOS and should remain synchronized with it.

## North star

Pauli's Place is the visual organization layer for StarNet's real workforce. Districts represent operating domains, buildings represent capability-scoped teams, and assigned citizens must come from real roster/runtime state. A district definition is not proof that workers are active.

```text
OWNER
  ↓
COMMAND / HEISENBERG
  ↓
MISSION ROUTING
  ↓
RIGHT DISTRICT + RIGHT SPECIALISTS
  ↓
TOOLS / MCP / SHELL / BROWSER / COMPUTER
  ↓
GAUNTLET / EVIDENCE / RECEIPT
  ↓
OWNER ONLY WHEN JUDGMENT OR APPROVAL MATTERS
```

## Physical planner contract

- City schema: `paulis.place.city`
- CityOS version: `2`
- Canonical city name: `PAULI'S PLACE`
- Districts: `9`
- Buildings: `13`
- Default room: `24 × 14` tiles
- Planner grid: `4` columns
- Inter-building gap: `4` tiles horizontally / vertically
- Building templates define organizational intent, not permanent coordinates.
- CityOS plans on a detached draft, validates it, then performs an atomic apply.
- Apply is reversible only while the live city has not diverged after the recorded apply.
- Manual REFIT remains the escape hatch.

## 1. Command District

### Heisenberg HQ

Purpose: executive bridge and First Mate office.

Slots:
- `orchestrator`

Capabilities:
- files
- web
- memory
- terminal

Heisenberg receives owner intent, creates/decomposes missions, routes work, monitors execution, collects evidence, and stops at approval boundaries. Heisenberg coordinates; it should not become the worker for every task.

## 2. Production District

### Software Factory

Slots:
- engineer
- apptester
- auditor
- reviewer

Capabilities:
- files
- web
- memory
- terminal

Operating loop:

```text
build → test → security audit → independent review → repair → verified artifact
```

### Pi Agent Foundry

Slots:
- engineer
- drafter
- apptester
- reviewer

Capabilities:
- files
- web
- memory
- terminal

Purpose: create/refine agent specifications and reusable worker capability only when a real capability gap exists. Reuse an existing specialty before minting another agent.

## 3. Revenue District

### Revenue Center

Slots:
- opportunist
- researcher
- prospector
- treasurer

Capabilities:
- files
- web
- memory

Purpose: find, research, qualify, and economically rank opportunities. Current business lanes include client-presence audits, lead/prospect discovery, scraper/data-product opportunities, and other evidence-backed paths to revenue.

## 4. Impact District

### Impact HQ

Slots:
- strategist
- envoy
- paralegal
- pitchwriter

Capabilities:
- files
- web
- memory
- terminal

Purpose: nonprofit/social-purpose strategy, funding readiness, case-for-support packaging, grant/funder research, program evidence, and outcome framing.

### Stewardship House

Slots:
- registrar
- negotiator
- closer
- ghostwriter

Capabilities:
- files
- web
- memory

Purpose: warm-network management, 3C scoring, cultivation sequencing, stewardship, advice-first relationship work, and approval-gated asks.

The Impact fundraising workflow is mission-invoked and off by default. It must not become an always-on donor-contact agent. Public outreach, grant submission, donor asks, campaign publication, and consequential spend require the configured approval boundary.

## 5. Creative District

### Creative Studio

Slots:
- designer
- writer
- marketer
- publisher

Capabilities:
- files
- web
- memory
- images

Purpose: brand, design, campaign creative, copy, media assets, and publish-ready content for the other districts.

## 6. Commerce District

### Commerce Factory

Slots:
- operator
- optimizer
- publisher
- treasurer

Capabilities:
- files
- web
- memory

Purpose: products, listings, optimization, ecommerce operations, Printify/POD preparation, Etsy/storefront work, publishing operations, fulfillment economics, and commercial read-back.

### Connector Exchange

Slots:
- operator

Capabilities:
- files
- web
- memory

Connector ports: `4`

Purpose: governed external-service capability. Examples may include Printify, Etsy, Firecrawl, Apify, Composio, publishing systems, and other connectors when they are actually configured. Configuration is not the same as a healthy live connection.

## 7. Intelligence District

### Intelligence Center

Slots:
- scout
- analyst
- researcher
- curator

Capabilities:
- files
- web
- memory

Purpose: research, monitoring, synthesis, competitive intelligence, opportunity signals, and evidence gathering.

### Memory Archive

Slots:
- archivist
- curator

Capabilities:
- files
- memory

Purpose: durable project history, evidence, reusable findings, institutional memory, and retrieval.

## 8. Experiment District

### Experiment Lab

Slots:
- analyst
- apptester
- reviewer
- optimizer

Capabilities:
- files
- web
- memory
- terminal

Purpose: bounded experiments with explicit hypothesis, baseline, challenger, metric, budget, guardrails, evidence, decision rule, promotion criteria, rollback, and retained learning. It is not an unconstrained self-modification zone.

## 9. Operations District

### Night Operations

Slots:
- nightwatch
- foreman
- operator
- scout

Capabilities:
- files
- web
- memory
- terminal

Purpose: 24/7 bounded unattended work, queue supervision, monitoring, recovery, and parking consequential decisions into Needs You instead of guessing.

## Cross-district operating flows

### Client / agency revenue

```text
Revenue Center
  → Intelligence Center
  → Creative Studio
  → Software Factory
  → Experiment / QA
  → Commerce / delivery
  → evidence + receipt
```

### POD / Etsy

```text
Revenue Center identifies opportunity
  → Creative Studio creates approved assets
  → Commerce Factory prepares product/listing
  → Connector Exchange calls Printify/Etsy when configured
  → Treasurer verifies unit economics
  → publish/spend boundary if consequential
  → provider read-back + evidence
```

### Nonprofit / NWKids fundraising

```text
Impact HQ
  → gather existing proof + case for support
  → Revenue/Intelligence research warm network + funder fit
  → Stewardship House applies 3C + cultivation stage
  → Creative Studio packages donor-facing materials
  → human approval before outreach/ask/submission
  → stewardship + evidence recorded
```

### Software factory

```text
Command / Heisenberg
  → Software Factory
  → App Tester
  → Auditor
  → Reviewer
  → repair loop
  → deployment approval when required
  → evidence / receipt
```

### Night shift

```text
approved mission queue
  → Night Operations
  → Foreman / Nightwatch supervision
  → district specialist work
  → reversible work continues
  → consequential step parks in Needs You
  → morning/return report
```

## Workforce layers

StarNet supports two distinct workforce classes:

1. Persistent operators — durable employees with long-lived identity and, when required, isolated compute.
2. Mission workers — disposable specialists spawned for bounded work and normally torn down afterward.

Reference persistent operator blueprints currently documented elsewhere in the repository include Cosmos, Heisenberg, Max, Fanni, and Montage. Blueprint presence is not proof that all five are provisioned or online.

The shared specialty catalog provides the reusable worker classes used to fill district slots. CityOS assignments are truth-preserving: unmatched slots stay vacancies rather than inventing agents.

## Execution ladder

Use the least-privileged deterministic lane capable of completing the work:

1. connector
2. MCP
3. shell
4. browser
5. desktop
6. vision

Do not use GUI/vision when a direct connector, API, MCP, CLI, or shell contract can complete the same objective safely.

## Product surfaces

### StarNet desktop / web station

The station is a projection of actual runtime state. Rooms, agents, workstations, missions, transcripts, memory, budgets, schedules, connectors, and deliverables must not claim activity the runtime cannot prove.

### Command Center

Command Center is the owner cockpit. It should show outcomes, working state, evidence, approvals, costs, and intervention points. It is not another orchestrator and should not bypass StarNet/Terabithia governance to execute arbitrary infrastructure commands.

### Gateway

The Pauli/StarNet gateway provides a narrow authenticated server-side bridge to the loopback StarNet sidecar. Public ingress must remain fail-closed and must not make internal StarNet ports public.

## Current revenue engines represented by the city

- Agency/client presence audits
- Opportunity/prospect research
- Apify Actor / scraper productization
- Printify → Etsy / POD product operations
- Publishing / Books / Living Editions
- Nonprofit fundraising readiness and cultivation
- Reusable software/product production

These are operating lanes, not guarantees of live provider credentials, active schedules, sales, or revenue. Provider read-back, mission receipts, cost evidence, and production runtime health remain the authority for live status.

## Truth rules

- Defined ≠ active.
- Configured ≠ connected.
- Connected ≠ healthy.
- Healthy ≠ verified outcome.
- A specialist listed in the catalog is not automatically a running citizen.
- A district with zero workers should show vacancy/ready/idle, not fake activity.
- Revenue and cost stay unknown/null unless a real ledger/provider proves them.
- Public publishing, donor/funder contact, spending, destructive changes, and other consequential work remain approval-gated.

## Architecture-change rule

Any future proposal that creates a second city manifest or replaces these 9 districts must first reconcile against `frontend/app/cityos.js`. Do not merge a competing district taxonomy into the gateway, Command Center, or another surface while CityOS still defines a different canonical structure. Either update CityOS and all consumers together under one reviewed migration, or keep this 9-district contract canonical.
