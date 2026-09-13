# Montage-cloud sync design (Video Department, v1, 2026-09-12)

Goal: Montage jobs run in the cloud, end to end. Nothing renders or stores on Bambu's laptop
(it is out of disk space). PostaStudios is the distribution arm in the same department.

## Lane map (grounded in pauli-montage-video-agent code + YAPPYVERSE-FACTORY#32)

| Lane | Role | State |
|---|---|---|
| Remotion/FFmpeg finishing | Final compose, subtitles, exports - $0 | PROVEN 2026-09-11 (23s 1080p zero-key render, 227 contract tests, base f8331b48). Moves off the laptop onto the Hostinger VPS. |
| RunPod serverless GPU (worker-comfyui) | WAN 2.1 / Hunyuan / LTX generation | PROVEN TODAY: first WAN 2.1 clip rendered 2:59 PM PDT, $0.86 total spend, pods torn down. Prepaid-balance-only. |
| fal.ai speed lane | Veo / Kling / MiniMax video, FLUX images | CREDENTIAL PRESENT, LANE UNPROVEN. Infisical holds the key as `FAL_AI_API`; Montage tools read env `FAL_KEY` (see montage .env.example). Wiring must map Infisical FAL_AI_API -> FAL_KEY at job dispatch. |
| HeyGen / Runway direct / Modal LTX-2 | Extra cloud providers already coded in tools/video | Keys/env slots exist (.env.example: HEYGEN_API_KEY, RUNWAY_API_KEY, MODAL_LTX2_ENDPOINT_URL). Not verified. |

## Storage: the cloud seam already exists

- Montage ships a storage abstraction: `YAPPY_STORAGE_BACKEND=local|s3` with
  `YAPPY_STORAGE_BUCKET / REGION / ENDPOINT_URL` (S3/R2-compatible). Exports can stream to
  cloud object storage with no laptop copy.
- RunPod network volume (recommended shape from today's runbook): model cache + render store.
  First run is slow because models cache to the volume; later runs reuse. Renders land on the
  volume, finishing pulls from it, exports go to object storage.
- tools/cost_tracker.py is the budget gate on every job.

## Job flow (department sync)

1. Job packet created in the city (MONTY / Video Department) - pipeline manifest from
   montage pipeline_defs/ (11 production pipelines).
2. Generate: RunPod serverless lane (prepaid, per-job approval) or fal lane (per-job approval).
   Assets land on the network volume.
3. Finish: Remotion/FFmpeg lane on the VPS ($0) - compose, subtitles, master.
4. Export: YAPPY_STORAGE_BACKEND=s3 -> cloud bucket. Versioned.
5. Distribute (only on owner approval of the exact artifact): PostaStudios REST API / MCP
   server schedules and publishes to connected networks. Montage's own publishers package is
   an empty stub - PostaStudios IS the publisher. This is the "sync to Montage along with
   PostaStudios" shape: Montage makes, PostaStudios ships.

## Gates (encoded, not aspirational)

- Per-job owner approval with exact cost shown before any paid run (RunPod/fal/HeyGen/Runway).
- RunPod spend: prepaid balance only. No card-on-file autoscaling.
- Publishing: owner approves the exact artifact and destination. Nothing auto-posts.
- Automations off by default, deliberately invoked.
