# 03_reconcile - write the methodology diff

One job: compare claims with the current philosophy and propose the smallest change.

## Inputs
- Working: `../02_extract-claims/output/claims.md`
- Reference: `../../../../_shared/methodology/operating-philosophy.md`

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- methodology-diff.md → output/
- gate.md → output/

## Human check
Confirm the diff improves repeatability and does not turn one anecdote into a rule. Edit the artifact in place; the next stage reads the approved version.
