# 06_proof-run — the golden mission, live

One job: run the golden mission on the server and capture proof that anyone can check.

## Inputs
- Working: 01–05 `output/EVIDENCE.md` (all must read `done`)
- Reference: ../_shared/PRD.md §1 (Night-1 steps 1–8 and the negative tests), §10 (env names)

## Process
1. Server agent deploys the merged heads of all four repos, sets the env from PRD §10, and restarts.
2. The captain speaks the golden mission to Instinct.
3. Server agent pastes raw output: the Terabithia mission record, the gateway task, the crew task ids, the receipt, and `verify-receipts`.
4. Run the three negative tests (bad bearer, publish request, city→Pi) and paste each refusal.
5. A different agent (not the one that built 02–05) checks every item in PRD §1 and signs `verified_by`.

## Outputs
- output/EVIDENCE.md: everything above, raw, with secrets removed.

## Human check
The captain hears the answer and the receipt id, then finds the same receipt id on the board.
