# 02_extract-claims - separate claims from proof

One job: turn source material into atomic claims with evidence strength.

## Inputs
- Working: `../01_ingest-evidence/output/source-ledger.md`
- Reference: `../../../../_shared/methodology/operating-philosophy.md`

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- claims.md → output/
- gate.md → output/

## Human check
Reject unsupported revenue claims and label anecdotes, hypotheses, and repeated evidence separately. Edit the artifact in place; the next stage reads the approved version.
