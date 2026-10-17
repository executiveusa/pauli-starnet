# Mission: SEO Audit — any company (parameterized template)

## What this is

A reusable, parameterized mission package. Heisenberg instantiates one copy of this
file per client by filling in the **Company intake** block below, then dispatches it
like any other mission. It is the evidence-layer counterpart to
`sovereign-agent-city-audit.md`: the City Audit scores agent/workflow fit, this
mission scores the client's *existing* organic-search footprint with real,
reproducible measurements. Neither invents numbers the tooling cannot produce.

## Underlying tool

This mission wraps `executiveusa/pauli-claude-seo` (25 sub-skills, 18 subagents,
53 execution scripts; Agent Skills format, `/seo <command> <url>`). That repo is
**not currently wired into `sidecar/tools/`** — there is no StarNet-native SEO
tool. To run this mission today, the dispatched worker needs one of:

- a worktree with `executiveusa/pauli-claude-seo` vendored (submodule or copy) and
  shell access scoped to `./bin/claude-seo run <script>.py` only, or
- a Claude Code session (CLI or an unrestricted environment) running the
  claude-seo skill directly, with the resulting JSON/PDF receipts handed back
  into this mission's `outcome`.

Wiring claude-seo's scripts into `sidecar/tools/` as a first-class StarNet tool
(so an in-app agent can run it without a side session) is **out of scope for this
mission** — track it separately if wanted.

## Company intake (fill in before dispatch — do not guess any of this)

The worker is stateless; everything it needs must be in the package. Ask the
owner for every field below. Leave a field explicitly `unknown` rather than
inferring it — an inferred business name, address, or domain is exactly the kind
of unverified claim this mission exists to avoid.

| Field | Required | Notes |
| --- | --- | --- |
| Company / brand name | yes | Exact legal or trading name as the owner wants it reported |
| Canonical domain to audit | yes | One root domain; redirects (e.g. `www.`) get noted, not assumed |
| Industry / business type | yes | local service, e-commerce, SaaS, publisher, agency — drives which sub-skills matter |
| Business location(s) | if local | city/region for local-SEO and map-pack checks; multiple locations named explicitly |
| Known entity-consistency concerns | no | e.g. "we moved locations," "there's a same-named competitor" — anything the owner already suspects, so the audit can target it instead of discovering it blind |
| Pages/paths that matter most | no | e.g. a booking flow, a catering page, a service list — tells the worker where to spend the most scrutiny |
| Competitor names/domains, if known | no | else the worker selects audience-matched competitors itself and must say how it chose them |
| Google Search Console access | yes/no | if yes: confirm OAuth/service-account credentials already exist at the path the worker's environment expects; if no, GSC/GA4 sections are reported `credential_required`, not estimated |
| Google Analytics 4 access | yes/no | same as above |
| Paid-extension budget approval | yes/no + cap | DataForSEO / Ahrefs / SE Ranking / Profound calls cost real money per call; default is **no spend** unless the owner names a tool and a dollar cap here |
| Report destination | yes | chat summary only, PDF via claude-seo's report generator, or both |
| Anything explicitly off-limits | no | e.g. "don't touch GBP," "don't contact anyone" — mirrors the gates below but lets the owner add client-specific ones |

If any `yes`-required field is missing when this mission would otherwise be
dispatched, Heisenberg stops and asks the owner for it — one `TASK_QUESTION`,
per the task-context-elicitation protocol — rather than dispatching with a gap.

## Objective

Produce a client-ready SEO data sheet and executive summary for the named
company's canonical domain, with every field marked `measured`,
`credential_required`, `unavailable`, or `failed` — never `estimated` — and
runnable again later to measure drift.

## Done-when

- A worker ran `/seo doctor` (or equivalent dependency check) first and reported
  the real runtime status before anything else.
- At minimum, technical, content, schema, images, sitemap, and (if local) local/maps
  checks ran against the real domain and returned real numbers, not placeholders.
- Core Web Vitals came from an actual PageSpeed Insights / CrUX call, mobile and
  desktop, not a visual estimate.
- Every GSC/GA4 field is either a real number from the owner's configured
  credentials, or explicitly `credential_required` with the reason.
- Every paid-extension field is either a real number from an approved,
  budget-capped call, or explicitly `unavailable` / `credential_required` —
  never run without the owner's named tool + dollar cap from the intake table.
- The receipt's `evidence` section ties every reported number to the exact
  command that produced it.
- A one-page executive summary separates `MEASURED` findings from any
  `observation -> implication -> confidence -> how we'd know we're wrong ->
  smallest test` recommendation; no recommendation is stated as fact.

## Inputs and context

- The completed **Company intake** table above.
- `executiveusa/pauli-claude-seo` at the commit the worker actually ran (record it
  in the receipt — do not assume the worker used `main`).
- Existing capability-grant conventions: `departments/financial/accountant-role.json`
  (default-deny, named grants, `never_implicit`) — this mission's
  `seo-audit-role.json` follows the same shape for the three access tiers below.
- `prompts/overlays/heisenberg.md` packaging contract.

## Capability tiers — what this mission can and cannot do, by access level

Stated plainly to the owner before dispatch, and restated in the receipt's
`credential_requirements` section so nobody reads a `credential_required` field
as a failure:

**Tier 1 — free, real network access, no credentials configured.**
Everything a worker can measure with zero setup: full technical crawl (redirects,
4xx/5xx, canonical/robots issues, duplicate/missing titles & meta, broken internal
links, depth distribution), on-page content/schema/image/sitemap analysis, real
Core Web Vitals via the free PSI/CrUX API, and free backlink signals (Moz's
limited free tier, Bing, Common Crawl). This tier alone is a legitimately
thorough audit and needs nothing from the owner beyond the domain.

**Tier 2 — Tier 1 + Google credentials.**
Adds Google Search Console (real clicks, impressions, CTR, position, top
queries/pages, indexing status) and GA4 (real organic sessions, engagement,
conversions, geo/device splits) for the last 90 days. This is where the mission
moves from "site inspection" to "business intelligence" — but only if the owner
confirms, in the intake table, that OAuth or service-account credentials are
already set up in the worker's environment. No GSC/GA4 number is ever
approximated when credentials are absent; the field reads `credential_required`.

**Tier 3 — Tier 1+2 + paid extensions.**
Adds competitor keyword-level visibility, backlink domain metrics, and AI-search
share-of-voice via DataForSEO / Ahrefs / SE Ranking / Profound. Each call costs
real money. This tier runs **only** when the owner named a specific tool and a
dollar cap in the intake table; the worker tracks spend against that cap
(claude-seo ships a `dataforseo_costs.py` budget tracker for exactly this) and
stops before exceeding it, reporting the remainder as `unavailable` with the
cap reached, not silently skipped.

## Allowed tools and skills

- Repository read on the client's domain via real network access (page fetch,
  render, PSI/CrUX, free backlink APIs) — no write access to the client's
  property.
- Google API read scopes already configured by the owner (GSC, GA4) — read-only;
  this mission never requests GSC verification changes or GA4 property edits.
- Paid-extension API calls strictly bounded by the intake table's named tool
  and dollar cap.
- Repository read/write inside this StarNet repo, on a branch, for the audit
  output files and receipt only.
- Public web research to identify competitors or entity-disambiguation sources,
  with source URLs and access dates recorded.

## Budget and gates (stops_before)

- No ads, no publishing, no site edits, no Search Console changes, no GBP
  changes, no backlink purchases, no schema changes — this is a read-only audit,
  full stop.
- No paid-API spend beyond the intake table's named tool + dollar cap; zero
  paid spend if that field is left blank or `no`.
- No outreach to the client or any third party.
- No claim of `measured` for anything the tooling did not actually return.

## Receipt format

One JSON receipt plus the Markdown executive summary, containing:

- `mission_id`, `company_name`, `domain`, `status`, `started_at`, `completed_at`;
- `tool_commit`: the exact `executiveusa/pauli-claude-seo` commit SHA used;
- `tier_reached`: 1, 2, or 3, and why (credentials present/absent, budget
  approved/not);
- `outcome`: paths to the data sheet, executive summary, and (if requested) PDF;
- `measured` / `credential_required` / `unavailable` / `failed` counts per
  section, matching claude-seo's own JSON contract
  (`crawl`, `technical`, `core_web_vitals`, `search_console_90d`, `ga4_90d`,
  `local`, `schema`, `content`, `geo_ai_search`, `sxo`, `backlinks`);
- `spend`: actual paid-API spend against the approved cap, if Tier 3 ran;
- `evidence`: the exact command/API call behind every reported number;
- `unknowns` and `tool_failures`: named plainly, never smoothed into a
  recommendation;
- `assumptions`: anything the owner left `unknown` in the intake table that the
  worker had to work around.
