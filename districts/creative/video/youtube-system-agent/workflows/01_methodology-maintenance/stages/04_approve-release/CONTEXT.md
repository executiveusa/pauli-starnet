# 04_approve-release - release the factory update

One job: apply only the approved diff and log the version.

## Inputs
- Working: `../03_reconcile/output/methodology-diff.md`
- Reference: `../../../../_shared/brand/four-gates.md`

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- release-record.md → output/
- gate.md → output/

## Human check
Bambú reads and approves the actual philosophy changes. Edit the artifact in place; the next stage reads the approved version.
