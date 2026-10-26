# StarNet v2: stages

Order matters. Sizing is AI time (sessions = one focused agent session, ~1-3 hours). Owner: **A** = architect (code in repos),
**B** = builder (server), **C** = captain. Status comes only from `_system/status.mjs`, using the v1 evidence rule.

| Stage | One job | Owner | Size | Needs |
|---|---|---|---|---|
| `00_verify-v1` | Independently verify v1 stages 02-05 (built by the architect, so B or C verifies) | B | 1 session | — |
| `01_results-flowing` | Deploy the foreman fix (8c25360), privacy pass, `FOREMAN_GITHUB_WRITE=1`, results posted on #63-#68 and #71 | B | ½ session | — |
| `02_intake-and-inbox` | Gateway: one inbox for Instinct + command center; factory intake queue (max 5/day, Heisenberg refuses the 6th) + grill-at-intake record | A then B wires Instinct | 1+½ | 01 |
| `03_spend-and-kill` | Per-mission cost ledger → caps ($20/mo, $2/day alert, $0.25/mission), kill route + "stop everything", spend board feed; newest-DeepSeek resolver; Opus only on captain flag | A | 1 | 02 |
| `04_personas` | Import 283 agency-agents personas (pinned b37b5bb) as model-agnostic data + district map; Dojo serves them read-only; review + quarantine | A | 1 | — |
| `05_security-district` | 13th district in the CitySpec + registry; attack-lab job (free tools: semgrep, gitleaks, dependency audit, ZAP baseline, trivy) and the G15 two-run gate with a separate model family | A then B installs tools | 1+½ | 04 |
| `06_factory-v2` | Guard redesign: OpenSandbox build, read-only token, separate deploy step with a deploy-only Coolify credential to a VPS preview area; exit bar encoded in the judge receipt (security, UDEC ≥ 8.5, the-extractor) | A (vibe-engineering) + B (Coolify credential, preview area) | 2 + 1 | 03, 05 |
| `07_firstmate-crews` | firstmate on the VPS; Heisenberg hands code jobs to it; each worker's state becomes a gateway event | B, with A's spec | 1 | 02 |
| `08_city-live` | The 2D world moves only on real gateway events (routed, walking to a district, tool call, result); boards: revenue, outcomes, factory products, spend | A | 1 | 02, 03, 07 |
| `09_first-loop` | One real repo intake → grill → … → VPS preview on the phone; independently verified = **PREVIEW VERIFIED** | A+B, verified by C | 1-2 | 06, 07, 08 |
| `10_offers` | Mission templates: Kindle done-for-you, smart-site, AI Employee (client StarNet + Instinct on WhatsApp Business) | A | 1 | 09 |
| `world-v2` (branch) | New 3D world + interactive agent rooms, grilled separately with C; swap in when done | A + C | separate | 08 |

Critical path to "works tonight": 00 ∥ 01 → 02 → 03 → (04 ∥ 05) → 06 ∥ 07 → 08 → 09. About 9-11 sessions of agent work, split between
A and B and run in parallel where the table allows. The captain's input is only the red taps.
