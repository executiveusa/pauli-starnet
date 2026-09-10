# New World Kids — autonomous nonprofit proof

Status: implementation candidate on `work/nwk-autonomous-proof-20260910`.

## Objective

Prove the first reusable nonprofit-growth run through the existing StarNet workforce control plane without inventing a second orchestrator.

The operator command is conceptually:

> Audit New World Kids for funding readiness.

The control-plane request is:

```http
POST /v1/workforce/nonprofits/readiness/plan
Authorization: Bearer <gateway-token>
Content-Type: application/json
```

```json
{
  "organizationId": "new-world-kids",
  "organizationName": "New World Kids",
  "organizationType": "nonprofit",
  "website": "https://nwkids.org",
  "geography": "Seattle, Washington",
  "projectId": "nwk-first-12",
  "budgetUsd": 8
}
```

## Planned mission chain

1. **Truth set** — establish verified facts, unknowns, assumptions, legal/fiscal-sponsorship status, public claims, and evidence sources.
2. **Funding readiness** — score only evidence-backed readiness and identify the top five next actions.
3. **Digital trust** — inspect the website and public presence for funder due diligence, search visibility, identity consistency, accessibility, trust evidence, and conversion friction.
4. **Opportunity scan** — research current grants, sponsorships, partnerships, and mission-aligned funding opportunities; verify eligibility/deadlines against primary sources.
5. **Reversible digital fix** — prepare one high-impact, low-risk fix on an isolated branch or preview; never merge or publish from this step.
6. **Commander brief** — summarize verified state, top actions, completed work, blockers, opportunities, evidence, and exact human decisions required.

Every step requires evidence. A model narrative by itself is not completion evidence.

## Human gates

A separate approved mission is required before any:

- identity verification or account creation
- legal or tax attestation
- grant submission
- external outreach
- borrowing or other financial commitment
- paid spend
- production merge
- consequential public claim

Research, audits, planning, draft preparation, branch creation, preview generation, and reversible non-production fixes may run autonomously when the assigned tool permissions allow them.

## New World Kids truth boundary

The proof must not claim independent 501(c)(3) status, confirmed First 12 participants, completed Seattle outcomes, secured funding, or approved partnerships unless current evidence proves those facts. Proyecto Indigo Azul history and Seattle First 12 evidence remain distinct.

## Runtime proof required

Code and CI are not enough. Before calling this autonomous path operational, run the endpoint through the live composite gateway and verify:

1. the readiness plan is returned;
2. each planned mission is accepted only when its execution lane is actually available;
3. the first read-only mission reaches the StarNet sidecar;
4. a real evidence receipt is returned;
5. blocked or approval-required work fails closed;
6. Command Center can display the resulting mission/evidence state without fabricating completion.

Until those six checks pass against a running environment, this is an implemented planning surface, not a proven autonomous production system.
