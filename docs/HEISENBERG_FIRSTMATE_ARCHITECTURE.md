# Heisenberg First-Mate Architecture

**Status:** architecture lock for brownfield integration

**Baseline:** `feat/harness-backend` / STARNET v0.10.12 generation

## Decision

STARNET remains the runtime and control-plane authority. Heisenberg is the single owner-facing First Mate / Revenue Commander layered on top of the existing STARNET overseer, roster, `team.dispatch`, `team.summon`, capability/consent model, Night Shift, channels, MCP, and durable workspace.

Do not replace STARNET with Firstmate, Pi, or Pauli's Place.

- **Firstmate** contributes supervision principles: one liaison, visible crew, isolated work, persistent state, restart-proof supervision, escalation only for real decisions.
- **Pauli's Place** contributes governed factory/service implementations through narrow adapters rather than a second control plane.
- **Pi** is the preferred custom-agent foundry only when the native STARNET catalog has a demonstrated capability gap.

## Brownfield constraints

1. Inspect before changing.
2. Preserve existing runtime/event/capability contracts.
3. Reuse native specialties before creating new agents.
4. Do not expose the loopback sidecar publicly.
5. Do not commit or print secrets.
6. Consequential external actions remain capability/consent gated.
7. No completion claim without objective evidence.
8. World/agent activity must reflect real backend state, never decorative fake work.

## Heisenberg role

Heisenberg is the canonical primary liaison. He converts owner intent into measurable missions, decomposes work, delegates to native specialists, monitors execution, asks for approval only at consequential boundaries, and returns outcome + evidence + decisions.

Heisenberg is an orchestration identity, not a second runtime.

## Native crew map

The existing `shared/specialties.js` catalog already owns most required outcomes. Prefer aliases over duplicate classes.

| Heisenberg-facing role | Native specialty | Purpose |
|---|---|---|
| Team Lead / crew coordinator | `foreman` | Split genuinely parallel work, dispatch specialists, merge results |
| Night Shift | `nightwatch` | Work unattended queues while parking irreversible steps |
| Watcher / tripwire | `scout` | Monitor named sources and alert only on meaningful change |
| Revenue Scout | `opportunist` | Find monetizable openings using live evidence |
| TARS / Builder | `engineer` | Smallest correct code change, tests, verified implementation |
| QA / Test Engineer | `apptester` | Reproduce real user-facing failures and exact steps |
| Security Auditor | `auditor` | Prove security findings, rank blast radius, never print secrets |
| Independent Reviewer | `reviewer` | Adversarial review before ship |
| Product Designer | `designer` | Purpose-first UI/visual/product design using existing patterns |
| Product Manager | `drafter` | Turn ideas into smallest useful scope and testable acceptance criteria |
| Operations / Commerce Operator | `operator` | Reliable repeatable automations, confirmation before irreversible work |
| Profit Guardian | `treasurer` | Costs, budgets, reconciliation, verified savings and totals |
| Lead Finder | `prospector` | Qualified lead research using verified public information |
| Content / Listing staging | `publisher` | Stage and schedule drafts; owner retains publish boundary |
| SEO | `optimizer` | Live-result-grounded search optimization |
| Web production | `webdesigner` | Build and verify real working pages in a browser |

Create a new specialty only if the requested outcome is not owned by an existing native class. A new name alone is not a capability gap.

## Three active workstreams

1. **SELL — Revenue Capture OS**
   - Lead product: paid Revenue Leak Map.
   - Research, evidence gathering, audit preparation, proposal drafting, and follow-up planning may be automated.
   - External outreach remains owner-approved until explicitly governed otherwise.

2. **USE — STARNET / Heisenberg**
   - Shared sovereign control plane for missions, evidence, agents, schedules, channels, and approvals.

3. **EXPERIMENT — Governed POD factory**
   - First commercial slice: Printify -> Etsy draft workflow.
   - Research and preparation can run autonomously.
   - Publishing, paid production, refunds, financial-account changes, and other consequential actions remain approval-gated.

Everything else is parked unless it explicitly replaces one of these three lanes.

## Provider boundary

Use narrow provider/factory adapters behind STARNET's capability and consent system.

Preferred shape:

`Owner -> Heisenberg -> native STARNET dispatch -> specialist -> capability/consent gate -> adapter/MCP -> provider -> read-back/evidence -> STARNET state`

Do not copy an entire second control plane into STARNET.

## Remote and voice control

Preserve the sidecar loopback boundary. Do not bind the raw sidecar to `0.0.0.0` or expose its internal API directly to the public internet.

Remote commands must enter the same canonical Heisenberg mission path. Prefer an already-supported authenticated channel such as Telegram when configured, or a narrow authenticated relay/tunnel. A remote voice path is not verified until a physical phone/microphone round trip has produced a canonical mission and returned a real response.

## Current integration truth to preserve

A local Windows/Gemini session reported local-only Heisenberg changes, Printify authentication, COSMOS environment mapping, and a known Etsy HTTP 403 blocker. As of the creation of this document, those local implementation commits were **not present on GitHub** and must not be described as shipped until the actual local branch is pushed and reviewed.

The local implementation branch should be pushed rather than recreated so its real diff can be audited:

`git push -u origin pauli/heisenberg-sovereign-wiring-20260830`

Then open a PR against `feat/harness-backend` and verify:

- no committed secrets;
- no duplicate specialist catalog unless a documented gap exists;
- baseline test failures are separated from introduced failures;
- capability/consent boundaries are preserved;
- provider probes are evidence-backed;
- local workspace mutations are clearly distinguished from repo-shipped changes.

## External blockers must remain explicit

- **Telegram:** channel credentials belong in the canonical Tauri/OS keychain path. Do not persist raw tokens in repo files or ordinary workspace JSON.
- **Etsy:** an HTTP 403 API-key failure is a credential/app activation blocker. Resolve that before treating OAuth or listing-write flows as connected.

## Acceptance contract

The Heisenberg integration is verified only when:

1. Heisenberg is the actual primary liaison in the running STARNET instance.
2. A harmless mission is decomposed into real native crew tasks.
3. World state reflects those real tasks.
4. Evidence is persisted and returned.
5. No consequential action happens without the canonical approval path.
6. The persistent server survives restart and recovers state.
7. Remote observation/control uses a secure channel or tunnel, not a public raw sidecar port.
8. Provider status comes from authenticated read-back, not environment-variable presence.
9. Repository changes exist remotely and pass the applicable evidence/secret/test gates.
10. Rollback is documented and tested for the deployed slice.
