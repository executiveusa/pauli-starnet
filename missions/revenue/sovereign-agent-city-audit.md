# Mission: Sovereign Agent City Audit delivery system

## Objective

Turn the $2,500 Sovereign Agent City Audit from a pricing idea into a client-ready delivery system that an operator can run repeatedly and use to qualify a $9,500 Pilot City, a $28K-$40K Full City, or $2.5K-$5K/month City Ops engagement.

## Done-when

The repository contains a versioned audit kit with all of the following, and a dry run against a clearly labeled fictional client proves every file can be completed without hidden context:

- a one-page scope and boundary sheet naming what is included, excluded, required from the client, turnaround assumption, and the four approval gates;
- an intake questionnaire and evidence-request checklist;
- an audit rubric that scores workflow value, agent fit, data and integration readiness, security and permission risk, human approval points, operating cost assumptions, and deployment readiness;
- a findings-report template with current-state map, ranked opportunities, proposed CitySpec, 30-day pilot plan, risks, assumptions, and next-step options;
- an evidence index and receipt schema that ties every material claim to a source URL, file, capture, command result, test, or explicit `unverified` label;
- a delivery checklist and internal QA checklist;
- a fictional worked example and machine-readable receipt showing the kit is usable end to end;
- tests or validation scripts for required sections, broken internal links, and receipt shape.

## Inputs and context

- Repo: `executiveusa/pauli-starnet`, canonical branch `feat/harness-backend`.
- Existing Heisenberg packaging contract: `prompts/overlays/heisenberg.md`.
- Existing architecture and evidence conventions: `docs/STARNET-SOVEREIGN-WORKFORCE-ARCHITECTURE.md`, `sidecar/workforce/contracts.js`, `docs/PAULIS-PLACE-CITY-ARCHITECTURE.md`, and existing QA receipts.
- Settled offer ladder is a market hypothesis, not validated pricing: City Audit $2,500; Pilot City $9,500; Full City $28K-$40K; City Ops $2.5K-$5K/month.
- The audit is the entry product. It must stand alone and must not promise deployment, revenue, savings, compliance, or security outcomes that the evidence cannot prove.
- Instinct is excluded from anything resold. Package only the StarNet/Hermes operating layer and the operator workflow.

## Allowed tools and skills

- Repository read/write on a new branch; local shell for formatting, validation, hashing, and tests.
- Existing repository docs, schemas, tests, and receipts.
- Public web research only when needed to check current factual claims; record source URLs and access dates.
- Heisenberg may delegate analysis, writing, schema, and QA to existing internal workers.
- No email, messaging, CRM, marketplace, social, payment, ad, checkout, credential, production-deploy, or destructive tools.

## Budget and gates

- Cash budget: $0. Use only existing infrastructure and free/local tools.
- Messages to other people: prohibited. Stop with a draft if outreach would help.
- Public publishing: prohibited. A release-ready local or repository artifact is allowed; do not publish or announce it.
- Money: prohibited. Do not buy services, domains, ads, data, or credits.
- Irreversible deletion: prohibited. Work on a branch; do not delete existing files or data.
- Logins/account approvals: stop and report the exact account, screen, and action needed.

## Receipt format

Return one JSON receipt plus a short Markdown summary containing:

- `mission_id`, `status`, `started_at`, `completed_at`, `branch`, and final commit SHA;
- `outcome`: paths to every deliverable;
- `validation`: commands run, test counts, pass/fail results, and the fictional dry-run result;
- `evidence`: file SHA-256 values and source URLs for external facts;
- `updated_state`: what is now reusable and what the next mission can consume;
- `assumptions`: especially pricing and turnaround assumptions that remain unvalidated;
- `blocked`: any gate encountered, with no claim of completion for blocked items;
- `not_proven`: willingness to pay, client demand, conversion rate, deployment success, revenue, savings, compliance, and security certification unless separately evidenced.
