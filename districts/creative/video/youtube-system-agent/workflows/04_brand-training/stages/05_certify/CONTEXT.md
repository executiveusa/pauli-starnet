# 05_certify - record capability

One job: issue certification by workflow or a specific remediation plan.

## Inputs
- Working: `../04_sandbox/output/sandbox-package.md`
- Reference: `references/scorecard.md`

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- training-record.md → output/
- gate.md → output/

## Human check
A human trainer signs the scope; no learner is certified by attendance alone. Edit the artifact in place; the next stage reads the approved version.
