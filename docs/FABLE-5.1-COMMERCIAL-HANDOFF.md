# Fable 5.1 Commercial Handoff — STARNET Sovereign Workforce

Use model: **Claude Fable 5.1**

This handoff is for a second-stage product/venture pass after the architecture and focused tests are reviewed. Do not start by rewriting the code.

## Repositories and exact sources

Primary product:
- `executiveusa/pauli-starnet`
- branch: `feat/harness-backend`

Reference operator image:
- `nickvasilescu/nicks-stack`
- pinned commit: `90b9975c5391591e98565d20d33554a6b91f2f85`
- pinned version: `0.2.2`

Older Pauli mirror:
- `executiveusa/pauli-nicks-stack-orgo`
- commit: `ad146427dacffa228e30d8b8c27e1615bd1ef4c5`
- version: `0.1.1`
- intentionally marked stale pending reviewed sync

## Your role

Act as a product architect, business-model designer, systems thinker and skeptical venture partner. The technical architecture has already been consolidated. Your job is to find the highest-leverage ways it can make money without turning it into generic SaaS or destroying the sovereign/control-plane architecture.

## Product in one sentence

**One person operates a company of persistent AI employees and disposable digital workers from one owner cockpit, with each durable employee able to have a role, computer, email, memory, apps, schedule, budget, permissions and audit trail.**

## Architecture you must preserve

### Command Center
Owner cockpit. Human authority, approvals, economics and portfolio view.

### STARNET
Workforce operating system/control plane:
- agents
- missions
- capability routing
- permissions
- computer ownership
- identity references
- budgets/costs
- evidence
- health
- scheduling

### Nick's Stack-inspired operator image
Reference employee appliance:
- Hermes
- Telegram
- AgentMail
- AgentPhone
- AgentCard
- Composio
- 1Password
- Obsidian
- Latitude
- MCP
- desktop control
- skills

### Compute fabric
Provider-neutral:
1. sovereign owned infrastructure first
2. local host only where isolation is not required
3. Orgo as optional burst capacity

Orgo is not the control plane.

## Non-negotiable technical laws

1. STARNET remains the source of truth for workforce state.
2. Command Center remains the owner cockpit.
3. Operator images are replaceable.
4. Compute providers are replaceable.
5. Secret values do not belong in workforce state.
6. Persistent employees require isolated compute.
7. Mission workers are ephemeral by default.
8. Completion requires evidence, not agent narration.
9. Execution routes connector → MCP → shell → browser → desktop → vision.
10. Prefer deterministic/API execution over human-like mouse use.
11. No fake online/completed/cost/preview state.
12. Human approval remains required for high-impact irreversible actions.

## Five core contracts already implemented

- Agent
- Computer
- Identity
- Mission
- Evidence

Review `docs/STARNET-SOVEREIGN-WORKFORCE-ARCHITECTURE.md` before proposing changes.

## Current implemented slice

Inspect these files:

- `sidecar/workforce/catalog.js`
- `sidecar/workforce/contracts.js`
- `sidecar/workforce/router.js`
- `sidecar/workforce/index.js`
- `sidecar/workforce/providers/orgo.js`
- `sidecar/workforce/providers/sovereign.js`
- `sidecar/workforce/operator-image.lock.json`
- `gateway/index.js`
- `gateway/workforce-server.js`
- `test/workforce-control-plane.test.js`
- `.github/workflows/workforce-gate.yml`

Public workforce surface:

- `GET /v1/workforce/status`
- `GET /v1/workforce/agents/:id/plan`
- `POST /v1/workforce/missions/plan`
- `POST /v1/workforce/missions`
- `GET /v1/workforce/missions/:id`

## Business question

Find the strongest path from this architecture to revenue.

Do not limit yourself to “sell AI agents.” Explore the system as infrastructure, managed service, operating system, agency multiplier, franchise layer, vertical employee product, white-label platform, one-person-business operating model **and autonomous publishing studio**.

## Publishing / Books is a first-class commercial vertical

Treat books and publishing as a primary business line, not a side feature.

STARNET should be evaluated as the operating system for a publishing company that can take an idea or client source material through research, writing, editing, design, production, publishing, distribution, repurposing and sales.

Reference workflow:

```text
IDEA / CLIENT MATERIAL
        ↓
Research agent
        ↓
Writer / Ghostwriter
        ↓
Fact-checker / Editor
        ↓
Art Director / Designer
        ↓
Publisher / Production agent
        ↓
MULTI-FORMAT EDITION
  ├─ print-ready PDF
  ├─ EPUB / ebook
  ├─ interactive web book
  ├─ two-page flipbook / Living Edition
  ├─ narrated / audio edition
  ├─ multimedia edition
  ├─ agent-readable knowledge edition
  └─ translated editions
        ↓
MARKETING FACTORY
  ├─ social excerpts
  ├─ short-form video scripts
  ├─ newsletters
  ├─ press materials
  ├─ landing pages
  ├─ outreach
  └─ launch campaigns
        ↓
COMMERCE / LICENSING / CLIENT DELIVERY
```

Analyze at least these publishing offers:

- memoirs and autobiographies
- founder/CEO authority books
- branded business books
- nonprofit impact books and reports
- interactive children’s books
- comics / illustrated stories
- training manuals and certification books
- educational workbooks
- local-history/community books
- ghostwriting-as-a-service
- white-label publishing for agencies
- book-to-content subscription service
- Living Edition upgrades for existing books
- multilingual editions
- audiobook / narrated editions
- corporate knowledge books
- book licensing and distribution
- print-on-demand commerce

For publishing, determine what should be automated, what needs specialist human review, where copyright/rights verification belongs, where factual review belongs, and where explicit owner/client approval is mandatory.

The product opportunity is not merely “AI writes books.” The differentiated product is an **evidence-driven autonomous publishing operation** where specialized workers coordinate through STARNET and every publication has a traceable production history.

## Required analysis

### 1. Product truth
Explain what this product actually is in plain English and what it is not.

### 2. Highest-value customer
Identify the first customer segment with:
- painful recurring work
- measurable economic value
- willingness to delegate
- enough workflow repetition for agents
- low enough compliance burden for a first market

Do not default to broad SMB.

### 3. Monetization map
Produce at least 15 monetization models. Include:
- managed AI employee monthly fee
- setup/onboarding fee
- per-computer/per-worker pricing
- outcome pricing
- usage margin
- vertical operator packs
- white-label workforce OS
- agency/reseller model
- managed infrastructure
- skills/workflow marketplace
- premium identity/compliance layer
- enterprise/on-premise sovereign deployment
- managed book production
- white-label publishing studio
- recurring book-to-content / Living Edition service

Score each 1–10 for:
- speed to first revenue
- gross margin
- defensibility
- complexity
- sales friction
- support burden
- fit with current architecture

### 4. Three strongest offers
For each, give:
- exact buyer
- exact painful job
- promise
- deliverables
- what the AI employee actually does each week
- human approval points
- onboarding time
- pricing
- estimated cost to serve
- gross-margin hypothesis
- retention mechanism
- reason to buy now

At least one of the top candidate offers must explicitly evaluate publishing/books if the economics are competitive.

### 5. One-person company model
Design how one human could run 10, 50 and 100 client-facing AI employees using STARNET. Identify what must become automated at each scale threshold.

Also model how one human could operate a multi-title publishing studio with concurrent book projects using persistent editorial/publishing agents plus temporary research, design, fact-check and production workers.

### 6. Vertical wedges
Find at least 12 verticals where a persistent agent with email + browser + apps + computer is materially better than a chat assistant. Rank them.

Examples are allowed but do not anchor on them:
- sports mentors/coaches
- local service companies
- nonprofits
- creative agencies
- ecommerce operators
- property/service operations
- professional practices
- authors / experts / creators
- publishers / agencies

### 6B. Publishing business deep dive
Treat publishing as its own venture inside the larger workforce system.

Produce:
- the best first publishing customer
- the best first book product
- a standardized production workflow
- worker roster and responsibilities
- human review checkpoints
- average production cycle
- cost-to-produce hypothesis
- pricing model
- margin model
- rights/copyright safeguards
- fact-checking/evidence policy
- distribution options
- recurring revenue after publication
- book-to-content flywheel
- white-label opportunity
- Living Edition / interactive edition opportunity
- whether publishing should be a standalone brand, vertical operator pack, or internal capability

Compare at least these revenue structures:
1. fixed-fee book production
2. premium ghostwriting package
3. monthly publishing studio retainer
4. white-label agency fulfillment
5. revenue share / royalty participation
6. Living Edition conversion fee + hosting subscription
7. book-to-content recurring subscription
8. corporate knowledge-book program

### 7. Moat
Separate real moat from feature theater. Consider:
- operational data
- durable memory
- workflow/evidence history
- operator-image ecosystem
- identity and permission model
- compute-provider independence
- customer-specific skills
- switching cost
- outcome history
- proprietary publishing workflows and production history
- reusable editorial/design templates
- rights/evidence provenance

### 8. Competitive map
Compare against:
- generic ChatGPT/Claude agents
- managed-agent agencies
- computer-use infrastructure companies
- browser-agent products
- orchestration frameworks
- RPA
- virtual assistants/BPO
- ghostwriting agencies
- self-publishing services
- book-production studios
- AI book generators

State what STARNET must own versus integrate.

### 9. Unit economics
Build simple models for:
- 1 persistent employee
- 10 employees
- 100 employees
- 1 book project
- 10 concurrent book projects
- 50 concurrent book projects

Include:
- model tokens
- compute
- email/phone/app integrations
- storage
- observability
- support
- human exception handling
- editorial review
- design/illustration
- production/export
- hosting where an interactive edition is included

Show which costs should be passed through and which should be bundled.

### 10. Product packaging
Design the minimum sellable package. Avoid a giant dashboard with 100 controls. The customer should understand:

“Here is your employee. Here is what they own. Here is what they did. Here is what needs your approval.”

For publishing, the equivalent should be:

“Here is your book. Here is its production stage. Here is the evidence/source record. Here is what needs your approval. Here are the editions and marketing assets ready to publish.”

### 11. Trust product
Define the trust experience:
- evidence
- approvals
- scopes
- spend limits
- contact limits
- escalation
- audit trail
- kill switch
- rollback

For publishing add:
- source provenance
- factual citation trail
- plagiarism/copyright checks
- rights and asset permissions
- author/client approvals
- version history
- publication receipts

Turn safety into a commercial advantage rather than friction.

### 12. Roadmap
Give:
- 7-day revenue experiment
- 30-day MVP
- 60-day operational hardening
- 90-day commercial product

Each milestone needs a measurable proof condition.

Include a parallel publishing experiment that can generate revenue without waiting for the entire workforce platform to be commercialized.

## Required final decision

End with exactly these sections:

### BEST BUSINESS
Pick one business model.

### BEST FIRST CUSTOMER
Pick one customer archetype.

### BEST FIRST AI EMPLOYEE
Define the exact employee.

### BEST PUBLISHING OFFER
Pick the single strongest book/publishing offer even if publishing is not the overall winning business.

### PRICE
Give a setup fee and recurring fee. Include publishing pricing separately where appropriate.

### WHY IT WINS
Maximum five bullets.

### WHAT NOT TO BUILD
List the distractions.

### NEXT 10 MOVES
Ordered, executable actions.

## Important behavior

Be aggressive about simplification. Challenge assumptions. If a subsystem has no commercial value, say so. If a feature belongs to an integration rather than STARNET, say so. Do not reward architectural complexity merely because it exists. The goal is a high-margin business, not a technology museum.
