# 06_factory-v2

**One job:** Sandboxed build, read-only token, separate deploy step to a VPS preview area; exit bar in the judge receipt.

**Owner:** architect + builder

**Done when:** Proof = one run: build in sandbox, deploy-only credential used only by the deploy step, BUILD_SHA on the preview equals the judged commit.

Evidence goes in `output/EVIDENCE.md` (shape: `../../starnet-v1/CONTEXT.md`). The builder never sets `verified_by` on its own work.
