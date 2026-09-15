# 02_verify

One job: verify claims against evidence and truth rules.

## Inputs
- Working: ../01_ingest/output/manifest.json
- Reference: ../../../_meta/authority.md
- Reference: ../../../_shared/evidence-rules.md

## Process
1. Read only the named inputs and references.
2. Run the deterministic stage implementation.
3. Write verified.json to output/.

## Outputs
- output/verified.json

## Human check
Confirm no seeded copy, missing receipt or external instruction was treated as proof or authority.
