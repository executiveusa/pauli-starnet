---
name: Local Hyperframes
slug: hyperframes
description: Local HTML-to-MP4 composition and headless render verification for faceless or UGC video. Use for isolated Hyperframes experiments and approved local video work; no cloud or paid generation by default.
category: Creator
requires: [workbench]
author: HeyGen
license: Apache-2.0
default: false
---

# Local Hyperframes
Status: skill files installed; fleet headless MP4 capability NOT YET VERIFIED. Don't claim renderer ready until the scratch smoke test passes.

1. Define resolution, duration, fps, storyboard and assets. Use owned/generated test assets for the initial smoke test. No client media or owner secrets in a vendor upload.
2. Read the pinned local version's help and current composition docs. Source currently requires Node22+ and FFmpeg. Keep installs/cache/output in an isolated scratch directory or approved disposable container, never production images, shared dependencies or global profiles.
3. Disable telemetry: `HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1`. Do not send feedback, usage data, issues or project uploads without separate scope. No cloud, TTS, stock subscriptions or provider calls just because upstream exposes them.
4. Author deterministic HTML/CSS/timeline composition. Seek each scene midpoint; check mounts, timing, text overflow and source asset availability. Prefer existing primitives when local and appropriate.
5. Confirm installed command syntax before use. Documented local sequence is `hyperframes lint`, `hyperframes check`, `hyperframes snapshot --at ...`, then local preview and `hyperframes render --quality draft --output out.mp4`. Commands may be run via the isolated project's wrapper. Never silently fetch latest using npx.
6. For the authorized scratch test render a short fixture. For real deliverables get final preview agreement within the existing workflow before rendering. No new paid dependency implied.
7. Verify MP4 is nonempty with ffprobe: codec, resolution, fps, duration, stream count and playable decode. Extract frames across beginning/middle/end and inspect actual pixels for blank frames, clipping, missing fonts/assets and bad motion. A successful render exit is not a visual pass.
8. Preserve command/version/revision, sanitized stderr, metadata and inspected frames. Report local headless success or exact blocker, including software-GPU fallback/timing. Keep outputs and rollback separate; clean only task-created scratch resources.

Source: https://github.com/heygen-com/hyperframes , revisione1925d4317fcd13c0e5799cd4767a3e2dd4c9238, Apache-2.0. Adapted local-only workflow excludes upstream automatic feedback, cloud and credential-usage branches. See references/hyperframes/SOURCE.md.
