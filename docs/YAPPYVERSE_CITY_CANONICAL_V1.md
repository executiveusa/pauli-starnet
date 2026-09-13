# YAPPYVERSE CITY CANONICAL V1

Status: canonical city truth record, generated 2026-09-13 by the Watcher lane (charter Phase B), updated same day with owner decisions.
Authority rule: this document describes the current canonical repo HEAD plus owner decisions made 2026-09-13. It does not invent behavior. Where runtime state is unverified, it says so.

## Verified current truth (2026-09-13)

- Canonical branch: `feat/harness-backend` (repo has no `main`).
- City spec source: `frontend/app/cityos.js` (`CityOS.DEFAULT_SPEC`, CityOS v2, schema `paulis.place.city`) with byte-identical mirror `website/app/app/cityos.js`.
- Districts: **11**. Buildings: **22**. (Counted by executing the spec, not by reading prose.)
- PAULI district ("PAULI'S HOUSE") added 2026-09-13: PAULI'S PENTHOUSE + PAULI'S PLACE + HALL OF CANON, owner-approved same day, first district in spec order. Pauli persona slots are honest vacancies until the persona lands (Phase 2).
- The live public city (Netlify site `pauli-starnet-city`, id `820f3b2f-63e7-4933-90de-4efdf37cebc5`) is STALE: old `world/*.js` stack, `/app/cityos.js` 404, does not reflect canonical HEAD.

## Owner decisions locked 2026-09-13 (voice note, relayed via main agent)

1. FINANCIAL DISTRICT IS CANON. The 10th district (6 buildings, commit `37acdd29`) is owner-confirmed. The 9/10 architecture lock doc (9 districts / 13 buildings) carries a sync note pointing here.
2. NAMING: **Yappyverse = the whole world, the entire experience. Pauli's Place = one named venue inside it.** Pauli is always spelled P-A-U-L-I, never "Polly". Code and doc renames to match are approved as a direction and land with the PRD implementation, not before.
3. VENUES: Pauli's Place and the Officina de Bambú (owner's office) are confirmed canon venues to be represented. Seattle 2056 was not mentioned in the decision; remains open.
4. REDEPLOY: approved in principle, but ONLY once the public city site build is provably complete - no Netlify deploys spent on partial builds. Held until then.
5. AVATARS: repo sprite library inventoried (38 sets, see below); owner will map his avatar names onto the existing sets. Mapping list delivered 2026-09-13.
6. FLEET ROUTING: the 2026-09-10 fleet-split approval (free default + OpenRouter paid lane opt-in) is confirmed real. The stale `route-policy.js` will NOT be ported; a reworked routing policy (evaluating a cheaper default such as DeepSeek because Groq keeps hitting free-tier limits, paid lane opt-in, fail-closed) goes into the PRD for owner approval first.
7. GRAPHICS: full upgrade plan wanted - Unreal Engine direction plus the Stefan 3D channel mine and video-pipeline learnings. Owner verdict on current graphics: not readable enough. PRD covers this.

## The 11 districts / 22 buildings (canonical HEAD)

Roles below are the spec's desired specialist slots, not proof of seated workers. Capabilities are the building's capability props. Seating, always-on vs mission-invoked status, and production-proof require live roster/runtime read-back (Phase D/G); all such fields are marked unverified here.

| District | Building | Label | Slots | Capabilities |
|---|---|---|---|---|
| pauli | paulis_penthouse | PAULI'S PENTHOUSE | pauli, archivist | files, web, memory, terminal |
| pauli | paulis_place | PAULI'S PLACE | council_chair, herald, analyst | files, web, memory |
| pauli | hall_of_canon | HALL OF CANON | curator, cartographer | files, memory |
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

## Sprite library inventory (frontend/city/assets/sprites/, mirrored at frontend/assets/sprites/)

38 sets total. 33 named characters: alien, astronaut, bear, capybara, caseyjones, crewmate, crthead, dario, endoskeleton, finn, freddyfazbear, ghostface, grimreaper, heisenberg, masterchief, minion, minionchar, morpheus, ninjaturtle, pepe, pikachu, plaguedoctor, ricksanchez, robocop, robot, samaltman, secretagent, skeleton, ultron, ultrondroid, vaultboy, voidwizard, xenomorph. 5 generic blanks: blank, blank_amber, blank_blue, blank_green, blank_red. 2 technical entries (_assembly, _preset) are not characters. Current city code skins walkers from the 5 blanks only and reserves heisenberg for an agent named HEISENBERG; the other 33 named sets have full animation frames but are not wired to agents yet. Many named sets are third-party IP lookalikes - fine for dev, to be replaced with original art under the graphics upgrade plan.

## Owner decisions locked 2026-09-13 (Pauli consolidation, via Instinct main agent)

8. PAULI DISTRICT IS CANON. Names approved: district "PAULI'S HOUSE", buildings PAULI'S PENTHOUSE / PAULI'S PLACE / HALL OF CANON. Pauli = one super-agent, constitutional watcher + portfolio governor, seated between owner and Hermes, never bypassing approval/budget/capability gates.
9. ASTRA RULE (standing): GPT-6 Astra via HyperAgent powers Pauli only when necessary and EVERY run needs per-mission owner permission - "always get permission to run pauli since hes expensive." No standing ceiling. Free-first routing is the default brain; Astra is deny-by-default escalation with a ledger receipt.
10. PAULIS-PLACE repo declared owner-authored canon; vision imports quote docs by path+SHA. Hermes, command-center, pi-agent stay separate dependency repos.
11. Repo census approved: 8 keep / 15 import / 92 archive. Archives execute per-batch only, each batch manifest signed off first; nothing deleted.
12. Pauli's Rime speaker: distinct pick (not bond = BARS, not masonry = command center), recorded in deploy config, easily changeable.

## Open owner items

1. Seattle 2056 venue: still required? (Not covered in the 2026-09-13 decisions.)
2. PRD approval: naming renames, venue additions, sprite mapping, reworked routing policy, graphics upgrade plan, redeploy-on-complete - all implement after PRD sign-off.
