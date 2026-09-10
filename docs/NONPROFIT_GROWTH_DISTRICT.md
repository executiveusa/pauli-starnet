# StarNet Nonprofit / Social Purpose Growth District

Status: first implementation slice on `work/nonprofit-growth-district-20260910`.

## Architectural decision

The existing City OS already has a canonical `IMPACT DISTRICT` with `IMPACT HQ` and `STEWARDSHIP HOUSE`. This implementation does not create a duplicate district. It makes nonprofit and social-purpose growth a first-class workforce business lane that is operated from the existing Impact District and coordinated through the existing StarNet control plane.

Command Center remains the owner cockpit. StarNet remains the source of truth for missions, permissions, budgets, evidence, agent/computer ownership, and health. Hermes-compatible operators execute work. The existing execution ladder remains: connector -> MCP -> shell -> browser -> desktop -> vision.

## Source-intelligence basis

The initial knowledge source is an 80-video package: 40 Cause Specialist records and 40 Monica Main records, with saved transcripts and per-video intelligence records. Source-derived tactics are not automatically treated as operational truth. Legal, financial, lending, fundraising-outcome, platform, and eligibility claims must be independently verified before client work.

Every reusable workflow should preserve:

- source / provenance
- stated goal and prerequisites
- claim versus evidence/opinion/example
- current verification result
- owner
- next action
- approval gate
- evidence requirement
- definition of done
- review date

## Business lane

`nonprofit-growth` is registered in `sidecar/workforce/catalog.js`.

Stages:

1. intake
2. baseline audit
3. claim verification
4. funding readiness
5. digital trust
6. funding discovery
7. application preparation
8. partnerships
9. execution
10. evidence review
11. commander brief
12. recurring monitor

Default policy is mission workers for specialist work, coordinated by an existing persistent lead. Do not create permanent agents merely because a workflow has a specialist step.

## First reusable skills

- `client-presence-audit` — existing generic baseline, already weighted for nonprofit/social-purpose clients
- `nonprofit-funding-readiness` — evidence-backed funding readiness and action backlog
- `nonprofit-digital-trust-audit` — funder-view public credibility and consistency
- `grant-fit-screening` — eligibility-first opportunity screening before drafting
- `major-donor-discovery` — relationship-proximity donor research, not blast outreach
- `nonprofit-weekly-commander-brief` — one concise evidence-backed owner report

The next workflow wave should add application preparation, fundraising materials, partnership pipeline, matching-gift capture where relevant, board readiness, local funding discovery, and verified business/credit readiness only where the organization is legally and financially eligible.

## New World Kids pilot

The first end-to-end proving mission is:

> Audit New World Kids for funding readiness.

Expected outputs:

- organization truth set
- public/digital trust baseline
- funding-readiness dossier
- ranked gaps
- top five agent-owned actions
- human-only decisions
- source/evidence receipts
- 30/60/90-day action plan

The pilot must preserve the distinction between historical Proyecto Indigo Azul evidence and current Seattle First 12 claims. It must not assert independent 501(c)(3) status, confirmed funding, completed Seattle outcomes, or approved partnerships without evidence.

## Human-in-the-loop boundary

Agents may research, inspect, draft, configure reversible settings, prepare code branches/PRs, update internal records, and perform other explicitly authorized digital work.

Human approval is required for identity verification, signatures, legal/tax attestations, financial commitments, loan or credit applications, final grant certifications, consequential public claims, public/external sends under the configured communication policy, and irreversible account/platform actions.

When blocked, produce one Task Brief:

`Decision needed -> Why -> Recommended option -> Alternatives -> Consequence -> Exact human action -> Resume point`

Continue independent work while that decision is pending.

## Truth contract

- Never convert a transcript claim directly into client advice without verification where current facts matter.
- Never represent a discovered grant as eligible before screening.
- Never represent a draft as submitted.
- Never represent a plan as completed work.
- Never fabricate impact, revenue, donor relationships, legal status, approvals, or platform state.
- Completion requires an evidence receipt appropriate to the action.

## Recurring operating loop

`AUDIT -> PRIORITIZE -> EXECUTE -> VERIFY -> REPORT -> LEARN -> REPEAT`

Initial recurring cadences:

- weekly funding/opportunity scan
- weekly commander brief
- monthly public-presence and digital-trust audit

Schedules are enabled only after the first New World Kids vertical slice completes with evidence.

## Commercial reuse

The same lane is intended to support a paid service for other nonprofits and social-purpose organizations. Client data must remain isolated. The reusable product is the audit-to-execution operating system: baseline, prioritized implementation sprint, evidence-backed progress, and recurring operations. Do not market unproven outcomes as case-study results.
