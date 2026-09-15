# Methodology maintenance pipeline

Flow: ingest evidence → extract claims → compare against current system → approve revision.

| Stage | Output | Gate |
|---|---|---|
| 01 ingest evidence | source ledger | provenance complete |
| 02 extract claims | claims with evidence strength | no promotion claims treated as facts |
| 03 reconcile | proposed diff | contradictions visible |
| 04 approve | methodology release | Bambú accepts operating change |
