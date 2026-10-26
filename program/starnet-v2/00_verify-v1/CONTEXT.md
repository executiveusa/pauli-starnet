# 00_verify-v1

**One job:** Independently verify v1 stages 02-05 (built by the architect).

**Owner:** builder or captain

**Done when:** For each of program/starnet-v1/02..05: rerun its proof; set verified_by in its EVIDENCE.md only if it reproduces; else record the gap.

Evidence goes in `output/EVIDENCE.md` (shape: `../../starnet-v1/CONTEXT.md`). The builder never sets `verified_by` on its own work.
