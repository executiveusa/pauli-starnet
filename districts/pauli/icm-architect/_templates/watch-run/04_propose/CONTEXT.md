# 04_propose

One job: turn verified events plus cross-examined disagreements into observe-only findings.

## Inputs
- Working: ../02_verify/output/verified.json
- Working: ../03_cross-examine/output/disagreements.json
- Reference: ../../../_meta/authority.md
- Reference: ../../../_shared/evidence-rules.md
- Reference: ../../../_shared/finding-schema.md

## Process
1. Read only the named inputs and references.
2. Apply deterministic finding rules to verified events, using disagreements as the evaluator cross-check.
3. Write proposals.json to output/.

## Outputs
- output/proposals.json

## Human check
Confirm every finding separates fact from hypothesis, conforms to the finding schema, and requires human approval.
