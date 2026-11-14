# StarNet v1 — the pipeline

One job: take StarNet from "code merged" to "the golden mission runs live, with a receipt".

## Stages (numbering is the order)

| Stage | One job | Repos touched |
|---|---|---|
| `01_truth` | The live city reports its real commit and stops faking activity | pauli-starnet |
| `02_front-door` | Instinct and the Command Center send one kind of intent to Terabithia | instinct-voice-agent, pauli-command-center |
| `03_city-route` | Terabithia routes city missions to StarNet as a fleet member | terabithia |
| `04_foreman` | Heisenberg takes a city mission, dispatches a real crew, returns a result | pauli-starnet |
| `05_receipts-board` | Every mission ends in a sealed receipt; the board is read from receipts | terabithia, pauli-starnet |
| `06_proof-run` | The golden mission runs live end to end; the evidence is captured | all, on the server |

Stages 02 and 03 can run in parallel. 04 needs 03. 05 needs 04. 06 needs all.
Later phases (districts, signed bridge, leases, walk-test gate, tenants) are in `_shared/PRD.md` §9.
They get stage folders only when they start.

## The status rule

Status is never typed by hand. `_system/status.mjs` reads each `NN_*/output/EVIDENCE.md` and reports:

- **done**: frontmatter has `status: done`, at least one `proof:` entry, and `verified_by` differs from `built_by`.
- **claimed**: `status: done` but the proof or the independent verifier is missing. This counts as not done.
- **blocked**: `status: blocked` with a `blocker:` line naming who must act.
- **open**: no evidence file.

## Evidence file shape (`NN_*/output/EVIDENCE.md`)

```yaml
---
stage: 04_foreman
status: done            # done | blocked
built_by: claude-session-01UT634v
verified_by: captain    # must differ from built_by
commit: executiveusa/pauli-starnet@<sha>
proof:
  - https://github.com/executiveusa/pauli-starnet/pull/NN
  - raw output pasted below, with secrets removed
blocker: ""             # when blocked: who must do what
---
```

Below the frontmatter, paste raw command output. Write no summaries in place of output.
