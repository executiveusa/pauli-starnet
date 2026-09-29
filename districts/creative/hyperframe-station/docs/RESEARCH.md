# HyperFrames research (2026-09-28)

## The repo (exact, verified)
- **heygen-com/hyperframes** - https://github.com/heygen-com/hyperframes
- "Write HTML. Render video. Built for agents." 43.7k stars, 4.2k forks, created 2026-03-10.
- **License: Apache-2.0 - free as he believed.** Commercial use allowed.
- Current CLI: hyperframes@0.8.86 (npx). Packages: @hyperframes/core, engine
  (Puppeteer+FFmpeg seekable capture), producer, studio, player,
  shader-transitions, aws-lambda. Catalog of reusable blocks (transitions,
  overlays, captions, charts, maps). hyperframes.dev playground live.
- Docs: hyperframes.heygen.com. Discord community linked from README.

## How it works (state of the art)
HTML is the source of truth for video. A composition = HTML file with data-*
timing attributes + a paused GSAP timeline registered on window.__timelines;
the engine seeks the timeline deterministically frame-by-frame and encodes
MP4/WebM via FFmpeg. Agent skills ship with it (the city already carries a copy
at /opt/pauli-hermes/optional-skills/creative/hyperframes - installed 2026-09-28
by the Opus session).

## Setup state on prod (2.25.241.209)
- npx hyperframes@0.8.86 verified working; Chrome Headless Shell v152 installed
  at /root/.cache/hyperframes (needed: unzip + libnss3 etc., now installed).
- First Kupuri render completed 2026-09-29 00:25 UTC (draft + standard).

## What people are doing with it (X/community)
- Title cards, typographic intros, product tours, captioned talking-head,
  audio-reactive visuals, shader transitions, website-to-video promos.
- The pattern that matters for us: DESIGN.md-first workflow (visual identity
  gate before any composition HTML) - aligns with his design law and the
  Collins protocol (strategy before styling).
