# 05_receipts-board — every mission ends sealed; the board reads receipts

One job: missions end with a hash-chained receipt, and every board is computed from missions + receipts.

## Inputs
- Working: executiveusa/terabithia `bridge/fleet/engine.ts`, new `bridge/receipts/`
- Working: ../04_foreman/output/EVIDENCE.md (the result shape actually produced)
- Reference: ../_shared/contracts.md §4–§5, ../_shared/PRD.md R6–R7

## Process
1. On a terminal mission status, build the receipt (contracts §4), link `prev_hash`, store it with the mission, and return `receipt_id`.
2. Add `scripts/verify-receipts`: it recomputes every hash and link, and exits non-zero on any break.
3. The board endpoint shapes missions + decisions for voice. `done` requires a `receipt_id`.
4. Tests: an edited receipt fails verification; a mission without a receipt never shows `done`.

## Outputs
- output/EVIDENCE.md: PR link, verify-receipts output on a clean chain and on a tampered one.

## Human check
The captain changes one letter in a copied receipt and sees verification fail.
