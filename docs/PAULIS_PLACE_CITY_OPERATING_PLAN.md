# Pauli's Place — City Operating Plan

**Status:** executable architecture / live activation still requires the running VPS sidecar

**CitySpec:** v2 — 9 districts / 13 buildings

**Authority:** STARNET owns city, workforce, capability, consent, evidence and schedule truth. Heisenberg is the owner-facing First Mate. Skills and cron routines do not bypass capability/approval policy.

## 1. City map and ownership

| District | Buildings | Primary responsibility | Native roles |
|---|---|---|---|
| Command | Heisenberg HQ | intent → mission, delegation, evidence, approvals | orchestrator / Heisenberg |
| Production | Software Factory; Pi Agent Foundry | software, sites, tools, agent creation only for real gaps | engineer, apptester, auditor, reviewer, drafter |
| Revenue | Revenue Center | opportunities, qualified prospects, audits, pricing/economics | opportunist, researcher, prospector, treasurer |
| Impact | Impact HQ; Stewardship House | nonprofit/social-purpose fundraising readiness, relationship cultivation, stewardship, eligibility/compliance | strategist, envoy, paralegal, pitchwriter, registrar, negotiator, closer, ghostwriter |
| Creative | Creative Studio | brand, copy, media, campaign assets | designer, writer, marketer, publisher |
| Commerce | Commerce Factory; Connector Exchange | product/listing operations, SEO, external commerce/data connectors | operator, optimizer, publisher, treasurer |
| Intelligence | Intelligence Center; Memory Archive | live research, monitoring, analysis, curation, durable knowledge | scout, analyst, researcher, curator, archivist |
| Experiment | Experiment Lab | controlled tests, QA, optimization and retained learning | analyst, apptester, reviewer, optimizer |
| Operations | Night Operations | unattended queue, blocker supervision, deterministic routines | nightwatch, foreman, operator, scout |

A district owns an outcome, not every skill used to achieve it. Cross-district dispatch is preferred to duplicate agents.

## 2. ICM operating pattern

Every durable client/product lane uses the same four-stage ICM spine:

```text
CONTEXT
  verified facts, vertical, objective, constraints, evidence, approvals
     ↓
01 AUDIT / RESEARCH
  current state + unknowns
     ↓
02 STRATEGY
  ranked plan + acceptance contract + budget
     ↓
03 EXECUTION
  real artifacts/actions + append-only evidence
     ↓
04 REPORTING
  same metrics vs baseline + prior period
```

Human approval should occur at consequential boundaries, not as a mandatory interruption between every harmless internal stage. The original agency workspace's stage-by-stage human checkpoints become explicit `NEEDS_YOU` gates only where client/public/financial/reputational action is about to occur or where evidence is ambiguous.

## 3. Revenue lane A — Agency Audit / Revenue Capture

**Trigger:** owner asks to audit/prospect a business, or an approved prospect is queued.

**Do not run continuously.** `client-presence-audit` remains `default:false`.

Workflow:

```text
Revenue / opportunist
  find a plausible opportunity with current evidence
      ↓
Revenue / prospector
  qualify identity, fit and relationship path
      ↓
Revenue + Intelligence / optimizer + researcher
  Client Presence Audit
  - website
  - search/local
  - reviews
  - social
  - 1–2 comparable competitors
  - explicit unavailable fields
      ↓
Impact branch when vertical=nonprofit/social-purpose
  donor/volunteer + impact visibility weighting
      ↓
Revenue / strategist or drafter
  30/60/90 plan + smallest useful paid engagement
      ↓
Creative / Production
  create evidence-backed audit artifact/prototype if mission asks
      ↓
Command
  NEEDS_YOU before external outreach/proposal/send
      ↓
04 Reporting
  monthly rerun against baseline only after a client exists
```

Audit truth law: current source or `Not available`; never guessed follower counts, reviews, rankings or engagement.

## 4. Revenue lane B — Sellable data / Apify Actor productization

**Owner:** `excavator` (Actor Prospector). `prospector` remains Lead Finder.

**Trigger:** the Actor-productization lane is explicitly enabled or Heisenberg is asked to find/build a sellable data product.

**Do not run daily by default.** The skill is `default:false` and should be a bounded weekly research cycle until one product proves demand.

Workflow:

```text
Intelligence / excavator
  search for proven demand / weak competitors / stale Actors
      ↓
Experiment
  validate target value + blocking difficulty + ToS/legal risk
      ↓
Production
  build Actor + schema + README
      ↓
Experiment / apptester + reviewer
  repeated real-target reliability tests
      ↓
Revenue / treasurer
  pricing rationale from comparable real products
      ↓
Command
  NEEDS_YOU before public Store publication / paid commitment
      ↓
Commerce / publisher
  publish after approval
      ↓
Intelligence
  monitor actual Actor Insights; never invent expected revenue
```

## 5. Revenue lane C — POD / Printify → Etsy

Existing code in this repository already provides the first adapter layer:

- `sidecar/providers/printify.js`
- `sidecar/providers/etsy.js`
- `sidecar/providers/unit-economics.js`
- `sidecar/mcp/paulis-place-connector.js`
- `sidecar/skills/heisenberg-crew-specs.js`

Existing read tools include Printify shops/products/blueprints, Etsy shops/listings, and unit-economics calculations. These are implementation assets, **not proof that a live Etsy shop is connected or that Printify fulfillment is linked to Etsy**.

POD workflow:

```text
Revenue / opportunist + researcher
  evidence-backed product/niche candidate
      ↓
Creative / designer
  product artwork / packaging / mockup evidence
      ↓
Commerce / operator
  Printify shop/product read-back + product preparation
      ↓
Revenue / treasurer
  actual cost + fees + margin / break-even
      ↓
Experiment / reviewer
  quality/legal/rights check
      ↓
Commerce / publisher
  stage Etsy listing
      ↓
Command
  NEEDS_YOU before publish, spend, order or financial-account action
      ↓
Commerce
  provider read-back / listing receipt
```

Live activation gates:

1. Printify token authenticates and returns the intended shop.
2. Etsy API key/access token authenticates and returns the intended shop.
3. The intended Printify↔Etsy fulfillment/store relationship is proven from provider state.
4. One draft product has verified unit economics using actual provider costs.
5. Rights/asset quality passes.
6. Publish remains approval-gated.

If Etsy returns 403, report credential/app activation as the blocker; do not pretend OAuth/listing writes are connected.

## 6. Revenue lane D — Impact / fundraising readiness

**Workflow:** `impact-fundraising-cultivation` — `default:false`.

Primary owner: Impact Strategist. Heisenberg dispatches specialists by stage.

```text
CONTEXT / Impact Strategist
  competence pack from existing proof
      ↓
Stewardship / Registrar
  warm-network 3C map
      ↓
Impact / Envoy
  three-touch cultivation plan
      ↓
Intelligence / Researcher
  local/regional/corporate/fiscal-sponsor funder map
      ↓
Impact / Paralegal
  eligibility + fiscal-sponsor/compliance review
      ↓
Impact / Pitchwriter
  one-page case for funding
      ↓
Impact Strategist
  one focused campaign + 90-day plan
      ↓
Creative / Production
  campaign assets / donation funnel only if requested
      ↓
Command
  NEEDS_YOU before asks, applications, calls, emails, public campaign or financial commitments
      ↓
Stewardship
  evidence-backed monthly relationship touch queue
```

### NWKids first application

Use the supplied fundraising playbook as project context, not as global fact about every nonprofit.

Initial NWKids deliverables:

1. **Competence pack** — consolidate verified proof already held across project sources; do not invent missing outcomes.
2. **Warm-network sheet** — `Name | Care evidence | Consistency evidence | Capacity signal | Relationship owner | Next touch`.
3. **One-page case for funding** — `Who do we help? What problem do they face? What changes because NWKids exists?`
4. **One focused campaign** — one sentence, one outcome, one audience, one evidence-backed target.
5. **90-day relationship plan** — at most three strong relationships first.
6. **Stewardship rhythm** — meaningful update when there is one; no filler merely to satisfy a calendar.

The warm list is relationship-first. The system may prepare drafts and research, but it must not automatically contact Veronika, HSI, Chosen Remedies, Kupuri Media, prior donors, or any other person.

## 7. Publishing / Books lane

Publishing/Books stays a first-class workforce lane, not a tenth physical district. It uses Intelligence → Creative → Production → Commerce with explicit manuscript, rights, public-release and paid-distribution approvals.

## 8. Cron policy — minimum useful autonomy, not noise

Timezone for the following Pauli's Place business routines: `America/Bahia_Banderas` unless the project itself specifies another timezone.

Routines are internal research/status/preparation only. No cron is permission for public outreach, publishing, spending or account mutation.

### Recommended live cron set

| Routine | Agent | Schedule | Purpose / guard |
|---|---|---|---|
| Night Ops — blocker sweep | `nightwatch` | `0 * * * *` | Inspect active work for meaningful blockers/stalls; report only change or intervention needed. |
| Revenue — opportunity scan | `opportunist` | `0 7 * * 1-5` | Evidence-backed internal opportunity backlog; no outreach. |
| Revenue — qualified prospect worklist | `prospector` | `30 7 * * 1,3,5` | Research/qualify existing candidate queue; no contact. |
| Actor Prospector — niche review | `excavator` | `0 6 * * 1` | Run only when productization lane enabled; research/validate/build draft, never public publish without approval. |
| Commerce — shop read-back | `treasurer` | `30 6 * * *` | Read provider/shop/economic state if connected; unknown if unavailable; no listing mutation/order. |
| Treasury — weekly unit economics | `treasurer` | `0 8 * * 5` | Recalculate active product margins from actual known costs only. |
| Impact — stewardship review | `envoy` | `0 9 * * 1` | Active impact projects only; prepare internal next-touch queue, never send. |
| Impact — monthly audit delta | `optimizer` | `15 9 1 * *` | Only clients/projects with a baseline; compare named metrics, do not run a fresh cold audit. |
| Intelligence — watchlist delta | `scout` | `15 7 * * *` | Named watchlists only; meaningful changes, not broad web wandering. |

### API payload shape

The running sidecar's `/api/cron` contract accepts `name`, `prompt`, `schedule`, `tz`, and `agentId`. The VPS activation agent should POST each routine idempotently after checking whether a job of the same name already exists. Do not create duplicates after restart/deploy.

Example for the corrected Actor Prospector identity:

```json
{
  "name": "Actor Prospector — niche review",
  "prompt": "If the Actor-productization lane is not explicitly enabled, report disabled and do nothing. Otherwise review evidence gathered since the last run, validate at most the strongest 2–3 sellable scraper candidates, continue a previously approved draft Actor when appropriate, and report niche evidence, reliability/legal blockers and next step. Never publish, spend, or claim revenue from projections.",
  "schedule": "0 6 * * 1",
  "tz": "America/Bahia_Banderas",
  "agentId": "excavator"
}
```

The older plan that used `agentId: prospector` for Actor productization is stale because `prospector` is the existing Lead Finder; PR #8 correctly introduced Actor Prospector as `excavator`.

## 9. Activation / evidence gates

Code merge is not live-city proof. The VPS operator must prove the running system in this order:

1. exact Git SHA on VPS;
2. City OS v2 loads;
3. `city.inspect` captures current station;
4. `city.plan` returns 9 districts / 13 buildings with no blocking routing errors;
5. owner approves the structural apply;
6. `city.apply` succeeds;
7. durable save read-back matches the applied city;
8. restart StarNet and confirm the same city persists;
9. register the approved cron set and read it back;
10. provider probes: Firecrawl, Apify, Printify, Etsy — configured/healthy/blocked distinguished;
11. one harmless internal mission in each enabled money lane returns evidence;
12. Cloudflare `Starnet-Gateway` health/auth proof passes;
13. Command Center/remote clients display real state, not fabricated activity.

## 10. Initial operating priority

Do not turn on every monetization lane at once.

Priority order:

1. **Agency Audit / Revenue Capture** — fastest path to a sellable evidence artifact using capabilities already present.
2. **NWKids Impact workflow** — internal proof case; build competence/warm-list/case assets without outbound asks.
3. **POD provider readiness** — prove existing Printify/Etsy adapters against real shops before product launches.
4. **Actor Productization** — weekly R&D until one niche clears demand/reliability/legal gates.
5. **Publishing/Books** — operate when an actual title/project enters the queue.

The city makes money by running verified lanes, not by keeping every agent busy. Idle is acceptable; fake utilization is not.