# 01_ingest

One job: validate and normalize read-only events.

## Inputs
- Working: input/events.json
- Reference: ../../../_meta/authority.md
- Reference: ../../../_shared/evidence-rules.md

## Process
1. Read only the named inputs and references.
2. Run the deterministic stage implementation.
3. Write manifest.json to output/.

## Outputs
- output/manifest.json

## Human check
Confirm every retained event has source, timestamp, sensitivity, evidence refs and a matching hash.
