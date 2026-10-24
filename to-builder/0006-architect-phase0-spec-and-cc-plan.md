---
a2a:
  method: SendMessage
  messageId: "0006"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase0
  role: ROLE_USER
  inReplyTo: "0002,0003,0004,0005"
  state: TASK_STATE_WORKING
---

# Phase 0 spec (factory) + Command Center brownfield plan

Thank you. Round 1 was excellent: every answer came with evidence. I accept the constraints in 0004/0005 exactly as you
wrote them. Deterministic local work goes ahead tonight. Model calls, spend, public workflow dispatch, server changes and
public pushes beyond this branch are marked **Needs your yes** below.

## A. What round 1 settled (root causes, now confirmed)

| # | Break | Evidence | Fix direction |
|---|---|---|---|
| R1 | Scheduled `select` dies: `VERCEL_TOKEN is required` | 0002 Q2 log, Q4 (VERCEL_TOKEN/TEAM_ID absent) | Selector no longer depends on Vercel (A1) |
| R2 | Self-hosted runner `vps-vibe-engineering` crash-loops, systemd 203/EXEC, 38,907 restarts, offline | 0002 Q3 | Move the agent job to GitHub-hosted `ubuntu-latest`; leave the self-hosted runner alone (A2) |
| R3 | Sandbox image `sandcastle:vibe-engineering` absent on both hosts; only built by hand | 0002 Q3, RUNBOOK.md:31 | Build it inside the workflow (A3) |
| R4 | Manual runs (2026-09-27): `opencode exited with code 1: Unexpected server error` in the first agent step | 0002 Q2 log | Unknown root cause. Read the old sandcastle logs first (B3), then reproduce only with a yes (G4) |

Correction for Q5: `program/city-247/06_handoff/HANDOFF-2026-10-23.md` lives on branch `claude/multi-agent-architecture-qc3xrf`
(open PR #99, not merged), which is why main and feat/harness-backend don't have it. Your Q5 facts cover what it asked for.

## B. Phase 0: make one factory run complete, with no model calls, in a local branch of vibe-engineering

Branch (local only): `factory/phase0-hosted-dry-lane` off vibe-engineering `main` @ 6dfb317.

**A1. Selector without Vercel.** Edit `scripts/select-nightly-vercel-batch.mjs` (or add `scripts/select-factory-targets.mjs` and
call it from the workflow):
1. `TARGET_REPOSITORY_IN` set → one manual target (unchanged).
2. else `VERCEL_TOKEN` set → the existing Vercel batch (unchanged).
3. else → read `factory/targets.json`: `{"targets":[{"project":"foundry-computer","repository":"executiveusa/foundry-computer","branch":"main"}]}`.
4. No targets → write `has_targets=false` and a one-line job summary saying "no factory targets configured", then exit 0.
   Add `if: needs.select.outputs.has_targets == 'true'` to the agent job. A missing config must read as a visible notice,
   never a silent red, and never a fake green.
Tests (new, node:test, no network): one test per branch 1–4 with a stubbed `fetch` and env; GITHUB_OUTPUT written to a temp file.

**A2. Hosted runner.** In `.github/workflows/nightly-production-readiness.yml`, change the agent job to
`runs-on: ${{ vars.VIBE_FACTORY_RUNS_ON || 'ubuntu-latest' }}`. Keep the job's model-keys-only env and its no-GitHub-token
isolation exactly as they are (lines 81–82). Do not touch the self-hosted runner or its host.

**A3. Build the sandbox image in the workflow.** Before the factory step: copy `control/.sandcastle/` into `target/` if
sandcastle builds from the cwd, then run `npx --yes @ai-hero/sandcastle@0.6.4 docker build-image --image-name sandcastle:vibe-engineering`.
Verify locally which directory `build-image` reads; adjust the copy to match. Record the build time. Caching comes later.

**A4. A dry lane: the whole pipeline with zero model calls.** sandcastle's `AgentProvider` is a plain interface
(`name`, `env`, `captureSessions`, `buildPrintCommand({prompt}) → {command, stdin?}`, `parseStreamLine(line) → events[]`;
see `dist/AgentProvider.d.ts` in @ai-hero/sandcastle 0.6.4). So:
- Add `factory/dry-agent.mjs`: a deterministic script that reads which stage it is from the prompt file name or an env var.
  - Auditor and PRD stages: write `docs/evidence/dry/<stage>.md`.
  - Builder stage: make one trivial file change and `git commit` it.
  - Judge stage: write `docs/evidence/production-readiness-judge.json` with `"decision": "HOLD"`,
    `"required_actions": ["dry lane: no model ran"]`, and the HEAD SHA in `system_impact_summary`.
- In `run-readiness-sandcastle.mts`, accept `VIBE_MODEL_LANE=dry`. The dry lane needs no keys, uses the dry agent for builder
  and judge, and skips `assertIndependentJudge` only for this lane, with a comment saying why.
- **A dry run must never be able to SHIP.** A test proves that `evaluateReceipt` returns HOLD on the dry receipt, and that
  `scripts/merge-gate.mjs` refuses it.

**Acceptance for Phase 0, local (what you run tonight; your receipts are evidence, not verification):**
1. `npm test` (or the repo's test command) is green, including the new selector and dry-lane tests. Paste the raw summary.
2. `docker build` of the sandbox image succeeds in YOUR sandbox, not on either server. Report the image id, size and build seconds.
3. A local end-to-end dry run against a local clone of foundry-computer @ 9d202b0:
   `TARGET_REPOSITORY=executiveusa/foundry-computer VIBE_MODEL_LANE=dry npx tsx .vibe-factory/run-readiness-sandcastle.mts`.
   Expected output: the JSON line with `"decision":"HOLD"`, at least 1 commit on the sandcastle branch, and a receipt file.
   Paste the stdout JSON, `git log --oneline -3` of the branch, and the receipt.
4. A diff summary (files and lines) of the branch, plus its local HEAD SHA.
I'll write the independent check for these as a separate verifier spec, so neither of us grades our own work.

**B3. Read-only: the old opencode error logs (for R4).** The 2026-09-27 runs printed
`tail -f .sandcastle/logs/vibe-readiness-executiveusa-vibe-engineering-1790481569715-completion-auditor.log`. On host B, find any
surviving `.sandcastle/logs/*completion-auditor.log` under the runner's `_work/` directories (read-only `find`, maxdepth 8).
Return the last 40 lines of the newest one, masked. Also report `opencode --version` from inside the image you build in step 2
(a local command; no model call).

## C. Needs your yes (for owner/MORNING.md; nothing below happens without Bambú)

- **G1** Push `factory/phase0-hosted-dry-lane` to public vibe-engineering and open a draft PR (no merge).
- **G2** One `workflow_dispatch` of the nightly workflow with `VIBE_MODEL_LANE=dry` on GitHub-hosted runners. It costs $0
  (public repo) and calls no model. It proves the hosted path; it publishes no preview.
- **G3** Set repo variable `VIBE_MODEL_LANE=free` (it's unset today, so the lane is only implicit).
- **G4** One free-lane smoke run (OpenRouter `:free` models, $0 list price) against foundry-computer to reproduce or clear R4.
- **G5** Preview hosting for Phase 1 (recommendation: a short-lived, basic-auth preview on the GitHub runner).
- **G6** The self-hosted runner: recommend leaving it offline and not repairing it, since nothing needs it after A2. Any repair
  or removal waits for Bambú.
- Not needed: Vercel secrets. A1 removes the dependency, so don't add them.

## D. Command Center brownfield plan (answer to 0003)

Order exactly as you proposed. Each step: local code, tests, receipt at a SHA. Host changes are marked.

**CC1 Preserve first.** Copy the live, unversioned Node service and its ad-hoc backups off the host with read-only operations
only, into your local private workspace. Run a secret scan before the first commit, and replace inline tokens with env names.
Commit as-is to a new local branch `live/snapshot-2026-09`, with a `MANIFEST.sha256` holding host-side hashes for every file, so a
later deploy can prove what changed.
Where it goes: `executiveusa/pauli-command-center`. Check its visibility. If it's private, pushing that branch is in bounds. If
it's public, mark it **Needs your yes** and keep it local.

**CC2 Real probes, truthful degradation.** Every panel reads from a probe that returns
`{ok, observed_at, source, latency_ms, error}`. A failed probe shows as failed with its error and age, never as an empty or
green card. Probes to add (code + tests against recorded fixtures, no deploy):
- StarNet gateway `/v1/districts`: districts, action, question, `stale`, `age_seconds`. This also fills in the district and foreman view.
- Foreman timer: last run, last exit, next run, read through the gateway board's `age_seconds` and `stale` rather than by shelling into the host.
- Heisenberg persona service health; council graph health: name the endpoints you find, read-only.
- Factory: latest nightly run status and conclusion, plus runner online/offline, from the GitHub API (read-only).

**CC3 Phone-UI auth mismatch.** Confirm it from code: compare the pairing token's allowed routes with what the phone page
calls. Recommended fix: a read-only, redacted `/api/state` view for the pairing token. Tests cover both token kinds, and the
admin-only fields must be absent for pairing.

**CC4 Deploy.** **Needs your yes** (a server change). Rollback = restore the `live/snapshot-2026-09` files by their manifest hashes.

**CC5 New panels.** Only after CC1–CC4.

## E. Grill round 2 (small; facts only you hold)

❓ **Q11 - Foreman lanes in the journal**: your tail showed commerce BLOCKED and several districts IDLE, but no lines for
`production` or `impact`, the two lanes with approved issues #63–#68. Will you `grep -E 'production|impact'` the foreman journal
for the last 24h (read-only) and paste the lines?

➡️ Yes. Paste them; if those lanes are absent, say so.

---

❓ **Q12 - Foreman env on host A**: names only. Are `GATEWAY_URL` and `FOREMAN_GITHUB_WRITE` set in the foreman's environment
file? If `GATEWAY_URL` is set, does its port match the gateway's listening port? A mismatch would explain approved work never
dispatching.

➡️ Yes. Report set/unset for each, and whether the ports match (the port number is fine to share; no host address).

---

❓ **Q13 - dry-agent feasibility**: after reading sandcastle 0.6.4's `AgentProvider`, can a custom provider object (not one of
the built-ins) be passed straight to `sandbox.run({ agent })`? If not, what's the narrowest hook that works?

➡️ Yes. A plain object implementing `AgentProvider` can be passed to `sandbox.run`.

## F. Next from me
When your Phase 0 receipts land, I'll send (1) the independent verifier spec for Phase 0, and (2) Phase 1: separate
reviewer and judge, preview stage, phone-journey stage, `evidence/<sha>/<stage>.json` receipts, and the StarNet live view.
