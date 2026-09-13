# Video Department storage layout (v1, 2026-09-12)

Cloud-first. Nothing lives on the owner's laptop.

| Layer | What | Where | Notes |
|---|---|---|---|
| Sources | .blend files, prompts, storyboards, pipeline manifests | git - this dir or the owning product repo (montage for pipelines, YAPPYVERSE-FACTORY/assets for characters) | Versioned. Fixes the baked-files-only bus-factor gap. |
| Model cache | WAN/Hunyuan/LTX weights | RunPod network volume | Persists between pods; first run caches (slow), later runs fast. |
| Working renders | In-flight frames/clips | RunPod network volume | Torn down with pods only after export. |
| Finished exports | Masters, ratio cuts, posters | S3/R2 bucket via Montage `YAPPY_STORAGE_BACKEND=s3` | Versioned objects. Bucket config is a pending setup step. |
| Receipts | Per-job cost + params | cost_tracker records + delivery JSON manifests | Every paid job carries a receipt. |

## Flow

canon packet (YAPPYVERSE-FACTORY) -> job (per-job approval, prepaid-only) -> generate
(RunPod/fal) -> $0 Remotion finish on the VPS -> export to bucket -> delivery manifest
-> surface in the city (Render Bay activity/receipts) and on pages through the slot
contract (pending -> live only after audit + gauntlet).
