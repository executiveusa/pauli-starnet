# UGC workflow audit - Montage vs PostaStudios (2026-09-12)

Method: walked both repos live via the GitHub API (executiveusa/pauli-montage-video-agent,
executiveusa/postastudios, default branches). "Exists" = code/manifests in the repo.
"Proven" = a real run/test with a receipt. Repo code search does not index these private
repos, so the walk was directory-by-directory; a file could hide outside the walked paths.

## MONTAGE (pauli-montage-video-agent)

### Claimed (README / marketing copy)
- "52 tools, 500+ agent skills", "12 pipelines", UGC-style videos, avatar spokespersons,
  URL-to-campaign workflows, cinematic ads, "world's first open-source agentic video
  production system". README also self-warns not to over-market unreviewed output.

### Exists (verified in repo today)
- pipeline_defs/: 12 YAML manifests = 11 production pipelines + framework-smoke (a test
  fixture). The 11: animated-explainer, animation, avatar-spokesperson, cinematic,
  clip-factory, documentary-montage, hybrid, localization-dub, podcast-repurpose,
  screen-demo, talking-head.
- NO pipeline named "ugc". UGC-shaped work maps onto:
  - avatar-spokesperson (stability: production) - presenter-led avatar videos: sales intros,
    spokesperson clips. Executive-producer orchestration, budget_default_usd $2.00, quality
    gates for lip-sync, framing, CTA. This is the closest thing to a UGC-ad workflow.
  - clip-factory (beta) - long-form -> many short social clips with hook placement.
  - talking-head (beta) - raw footage -> edited, subtitled talking-head video.
- Avatar/UGC machinery: tools/avatar (talking_head.py, lip_sync.py), tools/video
  (heygen, kling, minimax, hunyuan, ltx local+modal, cogvideo, grok, higgsfield, green-screen
  composite, auto-reframe, stock via pexels/pixabay).
- Tool count reality: ~77 non-init .py files under tools/ (14 analysis, 11 audio, 2 avatar,
  3 capture, 6 enhancement, 13 graphics, 1 subtitle, 19 video, 8 top-level). The 2026-09-11
  audit counted 80 BaseTool subclasses. Marketing's "52" undercounts.
- Cloud seams: YAPPY_STORAGE_BACKEND s3/R2 streaming, MODAL_LTX2 endpoint, Dockerfile,
  apps/studio-web (Next.js studio UI with generation/timeline/hosted-assets routes, .vercel).
- EMPTY: tools/publishers/__init__.py is an empty stub - no publishing implementation.

### Proven vs not
- PROVEN: zero-key local render (23s 1080p, 2026-09-11, base f8331b48); 227 contract tests
  passing (same audit); RunPod WAN 2.1 i2v clip TODAY 2:59 PM PDT ($0.86 total, pods down).
- NOT PROVEN: fal.ai lane (credential in Infisical as FAL_AI_API, tools expect FAL_KEY; never
  run); HeyGen/Runway/Modal lanes (env slots exist, unverified); studio-web deployed product;
  any UGC ad end-to-end (brief -> avatar -> finished ad -> published). No UGC ad has ever
  been produced by this stack - the 2026-09-11 proof was a generic 23s render.

## POSTASTUDIOS (postastudios)

### What it actually is
- A fork of TryPost (trypostit/trypost, AGPL-3.0) - an open-source social media scheduler:
  Laravel/PHP backend, React/Inertia frontend. README is still upstream TryPost copy and
  branding ("Run your whole social presence from one calendar", trypost.it links). The
  PostaStudios rebrand has NOT landed in the repo.

### UGC / ad-generation workflows: what exists
- AI copilot, TEXT+IMAGE only: app/Ai/Agents (PostContentGenerator, PostContentHumanizer,
  PostContentReviewer, PostContentStreamer, BrandAnalyzer, PostImageRegenerator) and
  app/Ai/Templates (image card / tweet card generators). Captions, hooks, drafts, carousels.
- Visual automations builder: schedule/RSS triggers, conditions, AI-generation steps,
  webhooks - server-side.
- MCP server + REST API: agents can draft, schedule, publish programmatically.
- 12-network native publishing, workspaces/roles/approvals, analytics.

### What does NOT exist
- No video anything. No avatar, no UGC-ad workflow, no video generation or editing.
  "UGC" as Bambu means it (creator-style video ads) is absent from this codebase.

### Proven vs not
- PROVEN (per 2026-09-10 fleet record): running on loopback on the Hostinger VPS, login
  healthy after a Redis AOF repair. Not publicly exposed.
- NOT PROVEN: any AI generation run from this fork, any publish to a live network from the
  fork, the PostaStudios rebrand/rebuild (sibling agent owns that work).

## Bottom line for the UGC-ads demo

The UGC ad workflow does not exist yet anywhere in the stack. The buildable path:
Montage avatar-spokesperson (production-stability manifest, $2 default budget, lip-sync/CTA
gates) + fal/RunPod generation lanes for the creator footage -> Remotion finish -> owner
approval -> PostaStudios publishes. Missing pieces to build: a UGC pipeline manifest
(pipeline_defs/ugc-ad.yaml) on top of avatar-spokesperson, the fal lane first-run proof, and
the PostaStudios publish handshake. Montage's empty publishers package means distribution
always routes through PostaStudios.
