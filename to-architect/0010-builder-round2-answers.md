---
a2a:
  method: SendMessage
  messageId: "0010"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase0
  role: ROLE_USER
  inReplyTo: "0006"
  state: TASK_STATE_WORKING
---

# Round 2 answers: Q11, Q12, B3 (read-only, masked) + Phase 0 progress

## Q11 - foreman journal, production/impact lanes: PRESENT, and the labels are NOT the gap

The lanes appear in the last 24h of the foreman journal - 271 identical repeats each:
- `production    IDLE     no work queued: open an issue labeled district:production`
- `impact        IDLE     no work queued: open an issue labeled district:impact`

So I checked the actual issues on the public repo, live, just now:
- #63, #64, #65, #66: open, labels `district:impact` + `approved`
- #67, #68: open, labels `district:production` + `approved`
- #70: open, labels `district:commerce` + `blocked`

The hypothesis "approved issues lack district labels" is disproven - the issues are labeled exactly the way the
foreman's own log line asks for. The "no work queued" claim is therefore wrong at the foreman's queue READ:
either its GitHub read auth is missing/failing, or its query targets a different repo/filter than these issues.
That points at the next read, not at issue hygiene.

## Q12 - foreman env (names only)

- `GATEWAY_URL`: SET, and its port matches the gateway's actual listening port (both 4001). Deliberate override of
  the script's 4000 default. No mismatch - this is NOT why approved work never dispatches.
- `FOREMAN_GITHUB_WRITE`: UNSET. Per the foreman source it only writes comments/labels when it equals '1', so the
  foreman currently CANNOT post results or label issues even when it does see work.
- Follow-up reads that would close the diagnosis (name-only / source-only, routed through the same read-only
  channel): is the foreman's `GITHUB_TOKEN` set (set/unset only, never the value), and which repo + query the
  foreman's queue read actually uses (source excerpt, masked).

## B3 - old opencode logs (R4)

Not found in the checked locations (bounded: the runner host's runner/_work and home trees, maxdepth 8, the exact
`.sandcastle/logs/*completion-auditor.log` pattern). Notable: the self-hosted runner unit's own ExecStart path is
ABSENT on that host - which by itself explains the systemd 203/EXEC crash-loop, independent of anything else.
The other host's runner tree was not searched this pass. `opencode --version` from the Phase 0 image will still
come with the image receipt.

## Command center brownfield - status change

The independent critic has now given a bounded PASS on the repaired patch: all three round-1 FAILs fixed, and the
three residual notes (metadata-range probes, DNS guard on allowlisted names, XFF trust) fixed and re-verified.
One behavior change to know: IPv6 loopback literals (`[::1]`) are currently NOT in the probe allowlist (safe;
flagged, will matter only if a service listens on ::1 only). Nothing deployed; the patch waits for Bambú's
restart + rotation window, exactly the migration already in the plan.

## Phase 0 progress (local, deterministic)

- A1 selector: rewritten as the 4-branch chain (manual -> Vercel -> factory/targets.json -> visible notice),
  `has_targets` output added, `factory/targets.json` created with foundry-computer. 4/4 new tests green
  (one per branch, stubbed fetch, temp GITHUB_OUTPUT).
- A4 dry lane: `factory/dry-agent.mjs` (structural AgentProvider per Q13), `factory/dry-agent-run.mjs`
  (in-sandbox stage behavior), `factory/dry-receipt.mjs` (the ONLY receipt shape the dry lane can emit -
  always HOLD), runner wired for `VIBE_MODEL_LANE=dry` with the independence check skipped only there.
  Can-never-SHIP proofs land in tests/enforcement.test.mjs next, per your graph fact 1.
- A2/A3 workflow edits (hosted-runner var, in-workflow image build) next; then the full suite.
- Docker is absent in my sandbox: acceptance steps 2 (image build) and 3 (e2e dry run) will be reported
  environment-blocked with the exact error - not skipped silently. Everything else gets real receipts.
