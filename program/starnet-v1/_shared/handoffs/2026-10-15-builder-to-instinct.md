# Handoff: builder session → Instinct (written 2026-09-28, refreshed 2026-10-15)

From the builder (cloud Claude Code session, repos + code). To Instinct (servers, deploys, secrets).
Captain: Bambú. Channel: repos + `program/starnet-v1/06_proof-run/output/EVIDENCE.md`. No secret values anywhere, only names.

## 1. Rules (both sides agreed)
- Nobody verifies their own work. `verified_by` never equals `built_by`. The auditor verifies Instinct-built work (terabithia #32 #34 #35, pauli-starnet #47, the proof run). The auditor or Bambú verifies builder work (stages 02–05, pauli-starnet #41 #43, terabithia #24 #27). Bambú referees.
- Receipts or it didn't happen. Paste raw output, not summaries.
- ICM method: the plan lives in `pauli-starnet/program/starnet-v1/` (CLAUDE.md router → CONTEXT.md → `_shared/PRD.md`, `_shared/contracts.md`). Status comes from `node program/starnet-v1/_system/status.mjs`, never typed by hand.

## 2. State of the code (merged)
- pauli-starnet `feat/harness-backend` @ `a5eb2276` (StarNet v1: #41 foreman + crew, #43 review fixes, #47 tierOf fail-closed, #46 reviewer model; since then #50 #51 #57 and others outside this program).
- terabithia `main` @ `f30d05f3` (#24 #27 receipts + head anchor, #25 #26, #28–#35 store, policy layer and the `human_review` migration).
- instinct-voice-agent `main` @ `84c7b7e6` (#2). pauli-pi-agent `main` (#68).

## 3. Open items
| Item | Owner | Status |
|---|---|---|
| Captain speaks the golden mission himself; hears the receipt id; finds the same id on `/api/v1/board` | Bambú | pending (the simulated voice run is labeled and doesn't count) |
| Captain's city-view check (crew moving = crew that actually ran) | Bambú | pending |
| Put the raw crew/board artifacts into the 06 packet (they went only to the auditor) | Instinct | open |
| Merge pauli-starnet #44 (evidence) after the voice run | Instinct | open (still unmerged on 2026-10-15; the 06 folder on the base holds only `.gitkeep`) |
| Merge terabithia #35 (the `human_review` status migration) | Instinct | done (merged; main matches the live DB) |
| Line-by-line check of the 06 packet against PRD §1 | builder | waiting on the two items above |

## 4. New task for you: rebuild the repo graphs with docs (you hold the key access)
The builder built **code-only** graphs of all 11 repos with graphify (local AST, no model). A model key adds:
the docs (PRD, contracts, evidence, READMEs) linked to the code, and real names for the clusters.

Setup (once): `pip install graphifyy` (or `uv tool install graphifyy`), then `graphify install` to register the skill.
Key: pull ONE model key from Infisical with a read-only machine identity scoped to that one secret. Don't load the whole project into the environment.
- OpenRouter: `OPENAI_API_KEY`, `OPENAI_BASE_URL=https://openrouter.ai/api/v1`, `OPENAI_MODEL=<model>` → `--backend openai`
- or Claude: `ANTHROPIC_API_KEY` → `--backend claude`
- Free models time out (seen twice tonight). Use `--max-concurrency 1 --api-timeout 900` if you stay on a free lane.

Per repo, on the **default branch** (the builder's first pass accidentally used stale feature branches):
```bash
git -C <repo> fetch origin && git -C <repo> worktree add --detach /tmp/wt-<repo> origin/<default>
graphify extract /tmp/wt-<repo> --backend openai --out <outdir>/<repo>
graphify cluster-only <outdir>/<repo>            # names communities with the model
git -C <repo> worktree remove --force /tmp/wt-<repo>
```
Repos: pauli-starnet (`feat/harness-backend`), terabithia, instinct-voice-agent, pauli-pi-agent, pauli-command-center, pauli-hermes-agent, pauli-tars-demo-, vibe-engineering, cryptocuties, clients-districts, afromation-starnet (all `main`).
Cross-repo map for StarNet v1: `graphify merge-graphs <each>/graphify-out/graph.json ... --out starnet-v1-all.json`.

Code-only sizes from 2026-09-28 to compare against (nodes / edges; pauli-starnet has grown since, so rebuild code-only first for its baseline): pauli-starnet 27,335 / 47,593 · terabithia 1,440 / 3,296 · instinct 92 / 145 · pi 10,277 / 25,317 · command-center 530 / 931 · hermes 102,383 / 219,064 · tars-demo 2,553 / 5,893 · vibe-engineering 1,606 / 2,127 · cryptocuties 572 / 1,053 · afromation 659 / 776 · clients-districts 29 / 43.
If a docs-included graph has **fewer** nodes than these, something was skipped. Say so, don't paper over it.

Notes:
- Doc text goes to the model provider. Keep `.env*` and secret files out (graphify respects `.gitignore`; add a `.graphifyignore` if unsure).
- Hermes is huge (102k nodes). Use `--no-viz` there if `graph.html` is too big to open.
- Where outputs live is Bambú's call. Committing `graph.json` + `GRAPH_REPORT.md` to each repo lets any agent query without rebuilding. Machine-local files (`cache/`, `.graphify_root`, `.graphify_python`) must not be committed.

## 5. The second skill: archify
Diagram skill (architecture, workflow, sequence, dataflow, lifecycle → standalone HTML). It lives on pauli-starnet `main` under `skills/archify` (it is NOT on `feat/harness-backend`; the earlier 153k-line stowaway in #45 was this folder). To use it: copy it to `~/.claude/skills/archify` and run `npm ci` inside.
Pairing: graphify answers "what connects to what". Archify draws it for people (e.g. the golden-mission sequence: captain → Instinct → Terabithia → gateway → Heisenberg + crew → receipt → board).

## 6. Things the builder found worth knowing
- The mission route reaches the permission check in 2 hops: `handleMissionRun → runOnce → makeConsentBroker`. Mission runs refuse background crew dispatch even under Full Access (#43).
- The receipt chain needs `<receipts>.head` beside `receipts.jsonl` on the same persistent volume. A missing head fails verification by design. Never hand-create one to make it pass.
- The gateway foreman timeout is `STARNET_FOREMAN_TIMEOUT_MS` (default 900000). Terabithia's dispatch timeout knob is from #34.
- Pending decisions in the PRD: P6b Supabase move (currently self-hosted on the old box, docker project "supabase"). MACS runs its own Supabase on the new server (D3/D4).

## 7. Suggested next step (needs Bambú's yes)
Add a StarNet SessionStart hook that installs graphify + archify and runs `graphify update .` each session, so every agent starts with a fresh graph. It touches every agent's sessions, so it waits for approval.
