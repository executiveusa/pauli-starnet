# Branch / PR Consolidation Report
Generated 2026-09-13 by Instinct Watcher lane (charter Phase A). Read-only inventory; no merges, closes, or deletes executed.

## pauli-starnet
Canonical: `feat/harness-backend` @ e7ad647 (no `main` exists). Open PRs: **0**. Closed-unmerged PRs: **18** (#1–#18 — every PR in repo history was closed without a GitHub merge; content landed via direct/cherry-picked commits. Verified by file-level diffs below).

### Ahead/behind vs canonical (behind/ahead)
| Branch | Behind | Ahead | Unique work | Classification |
|---|---|---|---|---|
| pauli/heisenberg-sovereign-wiring-20260830 | 127 | 3 | etsy.js/printify.js/unit-economics.js/doctrine — all PRESENT + identical in canonical | DELETE AFTER VERIFY (content ported) |
| pauli/heisenberg-architecture-20260830 | 127 | 1 | HEISENBERG_FIRSTMATE_ARCHITECTURE.md present in canonical | ARCHIVE |
| pauli/paulis-place-city-os-20260830 | 126 | 19 | old CityOS compiler lineage (cityos.js 510L); superseded by locked 9-district canon (PR #12 doc) | KEEP AS HISTORICAL PROOF |
| proof/orca-starnet-cloud-smoke | 124 | 2 | pauli-orca-cloud-sandbox-smoke.yml (192L) + Slice 1 doc (doc present in canonical; workflow MISSING) | PORT/REIMPLEMENT — §4.2: port smoke test onto fresh branch after comparing to current Orca contracts |
| pauli/control-plane-slice-1 | 124 | 2 | same 2 files as above (twinned) | same as above |
| pauli/sovereign-workforce-fabric-20260906 | 105 | 0 | — | DELETE AFTER VERIFY |
| pauli/gateway-sidecar-token-header-20260906 | 96 | 2 | empty file-level diff (content already in canonical) | DELETE AFTER VERIFY |
| claude/prospector-client-audit-v4ldve | 95 | 1 | client-presence-audit.md + niche-scraper-productization.md present in canonical | DELETE AFTER VERIFY |
| pauli/impact-district-revenue-ops-20260909 | 88 | 0 | — | DELETE AFTER VERIFY |
| pauli/fix-vercel-static-root-20260909 | 86 | 0 | — | DELETE AFTER VERIFY |
| pauli/city-architecture-v1-20260909 | 85 | 7 | REJECTED 15-district PR #11 manifest (gateway/city-manifest.js) | KEEP AS HISTORICAL PROOF — do not port (charter §1.3) |
| docs/canonical-city-product-report-20260910 | 84 | 0 | — | DELETE AFTER VERIFY |
| work/nonprofit-growth-district-20260910 | 83 | 9 | 3 nonprofit skills present in canonical; workforce catalog delta to spot-verify | DELETE AFTER VERIFY |
| work/nwk-autonomous-proof-20260910 | 80 | 5 | nonprofit-run.js + proof doc present in canonical | DELETE AFTER VERIFY |
| heisenberg/openrouter-secondary-lane | 79 | 1 | route-policy.js (158L, fail-closed model routing: Groq free default, OpenRouter paid lane opt-in, per-run $ cap) + 116L test — MISSING from canonical | PORT/REIMPLEMENT |
| feat/city-web-surface | 50 | 0 | — | DELETE AFTER VERIFY |
| docs/agent-constitution-prompts | 37 | 1 | prompts/constitution.md + overlays present in canonical | DELETE AFTER VERIFY |
| feat/fable-51-fleet-intelligence | 34 | 0 | — | DELETE AFTER VERIFY |
| feat/agent-comms-beads-adoption | 34 | 0 | — | DELETE AFTER VERIFY |
| chore/upstream-take-20260912 | 31 | 1 | line-triage-desk.md skill + line-templates tests MISSING from canonical | PORT/REIMPLEMENT |
| docs/bars-studio-overlay | 22 | 1 | bars.md identical in canonical | DELETE AFTER VERIFY |
| deploy/coolify-city-fallback | 1 | 2 | empty file-level diff | DELETE AFTER VERIFY |

## pauli-command-center
Canonical: `main` @ 50edeb1. Open PRs: **1** — #32 `feat/livekit-inbound-phone-agent` (draft, 1 ahead / 5 behind, fail-closed LiveKit inbound phone agent, updated 2026-09-11) — active WIP, KEEP. Closed PRs #1–#34: all closed-unmerged (same pattern as starnet).

### Ahead/behind vs main
| Branch | Ahead | Behind | Files | Classification |
|---|---|---|---|---|
| feat/starnet-realm-switcher | 13 | 56 | 12 | REVIEW BEFORE ARCHIVE (2 closed-unmerged PRs #16/#17) |
| pwa-android-fast-load | 13 | 5 | 13 | REVIEW/PORT — unique unPR'd PWA work |
| fix/owner-account-signin | 11 | 21 | 8 | REVIEW (PR #25 closed-unmerged; sign-in flow may have landed differently) |
| feat/finish-command-center-proof-loop | 8 | 51 | 6 | REVIEW/ARCHIVE |
| feat/apple-level-control-polish | 7 | 52 | 7 | ARCHIVE (superseded polish lineage) |
| feat/pi-realm-live | 6 | 2 | 14 | CHERRY-PICK REVIEW — PR #34 closed-unmerged 2026-09-13 yet /pi is live; 6 commits possibly unshipped hardening |
| feat/apple-level-polish / approval sheets / mobile polish cluster (7 branches, 1–4 ahead, 48–63 behind) | 1–4 | 48–63 | 1–4 | ARCHIVE (superseded by later merged-equivalent work) |
| feat/pi-private-realm-2026-09-10 | 4 | 10 | 10 | REVIEW vs feat/pi-realm-live |
| pauli/fable-activation-receipt-20260906 | 3 | 22 | 4 | ARCHIVE |
| feat/cosmos-owner-ops-v2, feat/heisenberg-live-gateway, fix/canonical-approval-read, fix/voice-owner-quota-boundary, ops/release-artifact-8f7d187, fix/vercel-source-deploy, pauli/orca-control-plane-lock | 1–2 | 48–80 | 1–2 | ARCHIVE |
| docs/gemini-command-center-wiring, feat/city-architecture-v1, feat/command-center-gauntlet, feat/grinion-os-v1, feat/llm-council-button, fix/open-command-center-home, instinct/canonical-wiring | 0 | 4–87 | 0 | DELETE AFTER VERIFY (content fully in main) |

## Unexplained-open-PR check
pauli-starnet: none open. command-center: #32 is an explained active draft. PASS.

## Parked actions (NEEDS_YOU — not executed)
1. Delete/archive the ~25 content-merged branches (both repos) — irreversible-ish, parked per gates.
2. Close-comment hygiene on closed-unmerged PRs — public repo, counts as external-visible; parked.
3. Port route-policy.js + line-triage-desk + Orca smoke workflow onto fresh branches — queued as Phase A follow-through (port = new commits, reversible; will execute in-program unless parent objects).
4. feat/pi-realm-live 6 unshipped commits — fold into Phase D owner-control verification before any cherry-pick.
