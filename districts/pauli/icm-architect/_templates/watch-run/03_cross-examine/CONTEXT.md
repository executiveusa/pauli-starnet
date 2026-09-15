# 03_cross-examine

One job: compare mission, result and watcher verdicts.

## Inputs
- Working: ../02_verify/output/verified.json
- Reference: ../../../_meta/authority.md
- Reference: ../../../_shared/evidence-rules.md

## Process
1. Read only the named inputs and references.
2. Run the deterministic stage implementation.
3. Write disagreements.json to output/.

## Outputs
- output/disagreements.json

## Human check
Confirm watcher disagreement and evaluator failure cannot erase the primary result.
