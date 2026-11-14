# 01_truth — the live city tells the truth

One job: production reports its real commit, and nothing on the public city is decorative.

## Inputs
- Working: executiveusa/pauli-starnet PR #41 (`revision`, honest repo activity, `unknown` citizens)
- Reference: ../_shared/PRD.md §4 (public city row), §7 law 7
- Reference: ../_shared/contracts.md (none yet; this stage only reads)

## Process
1. Captain removes the required `watch` check on `feat/harness-backend` (it never runs on PRs), then merges #41.
2. Server agent deploys the StarNet gateway from the merged head with `STARNET_REVISION=<that sha>`.
3. Server agent runs `GET /health` and the public `/v1/city/status`, and pastes the raw output.
4. Establish which gateway serves production today: the Node `gateway/server.js`, or Hermes `starnet_gateway.py` at `/starnet-gw`. Write the answer as a fact with the proof.

## Outputs
- output/EVIDENCE.md: raw `/health` + city-status output, the merged sha, and which gateway serves production.

## Human check
The captain opens the public city and sees citizens as `unknown` (not `online`), plus repo activity with no agent names.
