# YAPPYVERSE CITY CANONICAL V1

Status: canonical city truth record, generated 2026-09-13 by the Watcher lane (charter Phase B).
Authority rule: this document describes the current canonical repo HEAD. It does not invent behavior. Where runtime state is unverified, it says so.

## Verified current truth (2026-09-13)

- Canonical branch: `feat/harness-backend` (repo has no `main`).
- Canonical SHA at verification: `77d0d3996e2ce7cef921568b6b4555b53c1a600d`.
- City spec source: `frontend/app/cityos.js` (`CityOS.DEFAULT_SPEC`, CityOS v2, schema `paulis.place.city`) with byte-identical mirror `website/app/app/cityos.js`.
- World name in spec: `PAULI'S PLACE`.
- Districts: **10**. Buildings: **19**. (Counted by executing the spec, not by reading prose.)

## Conflicts found and how this record resolves them

1. `docs/PAULIS-PLACE-CITY-ARCHITECTURE.md` (locked 2026-09-10 via PR #12) says 9 districts / 13 buildings and carries an architecture-change rule requiring a reviewed migration to change that. Repo HEAD has carried a 10th district (Financial, 6 buildings) since commit `37acdd29` (2026-09-13 00:51, owner git identity). The doc is stale relative to HEAD. NEEDS OWNER CONFIRMATION: Financial District as permanent canon (see below).
2. The live public city (Netlify site `pauli-starnet-city`, id `820f3b2f-63e7-4933-90de-4efdf37cebc5`) is STALE and mismatched: title "Yappyverse — Live City", loads an older `world/*.js` stack, and `/app/cityos.js` 404s. It does not reflect canonical HEAD. Redeploy from canonical SHA is required (Phase B §5.5).
3. Naming (charter §5.2): YAPPYVERSE = the entire world; Pauli's Place = one named venue inside it. Current code names the whole city spec `PAULI'S PLACE` and the live page header says Yappyverse. This is a product-identity decision; parked for owner call, not unilaterally renamed.
4. Canon locations (charter §5.3): Pauli's Place, Polly's Place, Officina de Bambú, Seattle 2056 are not represented in the current spec. Functions ambiguous; parked for owner confirmation before adding labeled placeholder venues.
5. Avatars (charter §5.4): sprite packs in `frontend/city/assets/sprites/`: `blank` (5 color variants), `ultron`, `minion`, `heisenberg`. Only `heisenberg` is a named character asset; the rest are generic. Approved Yappyverse character assets are not available in the repo. Blocker surfaced; no fabricated assets; runtime functionality preserved.

## The 10 districts / 19 buildings (canonical HEAD)

Roles below are the spec's desired specialist slots, not proof of seated workers. Capabilities are the building's capability props. Seating, always-on vs mission-invoked status, and production-proof require live roster/runtime read-back (Phase D/G); all such fields are marked unverified here.

| District | Building | Label | Slots | Capabilities |
|---|---|---|---|---|
| command | executive_hq | HEISENBERG HQ | orchestrator | files, web, memory, terminal |
| production | software_factory | SOFTWARE FACTORY | engineer, apptester, auditor, reviewer | files, web, memory, terminal |
| production | pi_foundry | PI AGENT FOUNDRY | engineer, drafter, apptester, reviewer | files, web, memory, terminal |
| revenue | revenue_center | REVENUE CENTER | opportunist, researcher, prospector, treasurer | files, web, memory |
| impact | impact_hq | IMPACT HQ | strategist, envoy, paralegal, pitchwriter | files, web, memory, terminal |
| impact | stewardship_house | STEWARDSHIP HOUSE | registrar, negotiator, closer, ghostwriter | files, web, memory |
| creative | creative_studio | CREATIVE STUDIO | designer, writer, marketer, publisher | files, web, memory, images |
| commerce | commerce_factory | COMMERCE FACTORY | operator, optimizer, publisher, treasurer | files, web, memory |
| commerce | connector_exchange | CONNECTOR EXCHANGE | operator | files, web, memory |
| intelligence | intelligence_center | INTELLIGENCE CENTER | scout, analyst, researcher, curator | files, web, memory |
| intelligence | memory_archive | MEMORY ARCHIVE | archivist, curator | files, memory |
| experiment | experiment_lab | EXPERIMENT LAB | analyst, apptester, reviewer, optimizer | files, web, memory, terminal |
| financial | revenue_hall | REVENUE HALL | controller, analyst | files, web, memory |
| financial | treasury_payments | TREASURY + PAYMENTS | treasurer | files, memory |
| financial | cost_tokenomics | COST + TOKENOMICS | analyst, auditor | files, memory, terminal |
| financial | accounting_close | ACCOUNTING + CLOSE | controller, accountant | files, memory |
| financial | tax_office | TAX OFFICE | taxreviewer | files, memory |
| financial | executive_finance | EXECUTIVE FINANCE | controller | files, memory |
| operations | night_ops | NIGHT OPERATIONS | nightwatch, foreman, operator, scout | files, web, memory, terminal |

## Open owner items from this phase

1. Confirm Financial District (6 buildings, added 2026-09-13 in `37acdd29`) is owner-approved canon. If yes, the 9/13 district lock doc gets a sync note; if no, the district comes out under one reviewed migration per that doc's own rule.
2. Naming call: Yappyverse (world) vs Pauli's Place (venue) — current spec names the whole city PAULI'S PLACE.
3. Canon venues (Polly's Place, Officina de Bambú, Seattle 2056): confirm still required; then added as labeled placeholders only.
4. Approved character/sprite assets for owner-facing avatars — currently generic packs only.
