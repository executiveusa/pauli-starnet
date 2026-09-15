# 01_ingest-evidence - capture source evidence

One job: register evidence without interpreting it.

## Inputs
- Working: `input/source-links.md`
- Reference: `../../../../_shared/corpus/jake-trinder-20/CONTEXT.md`

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- source-ledger.md → output/
- gate.md → output/

## Human check
Open every cited source; verify author, date, URL, and commercial interest. Edit the artifact in place; the next stage reads the approved version.
