# Hairline animation skill

Generate a single self-contained HTML file: thin-stroke line art that reacts
to the pointer. No libraries, no fonts, no images, no network - one file that
runs anywhere a browser runs.

## Anatomy (the bar)

1. **Intro draw-on.** The brand name as SVG `<text>` with `fill: transparent`,
   a 1px stroke, and `stroke-dasharray`/`stroke-dashoffset` animated to zero
   (~2.2s), then a soft fill-in. Sub-line fades in after. Overlay lifts at
   ~3.4s and leaves the wordmark as a small corner brand on a bg chip.
2. **The field.** A staggered isometric grid (row offset half a gap, vertical
   squash ~0.5) of seeded line-art figures. Seed a mulberry PRNG per figure so
   layouts are deterministic. A figure = a small base shape plus 9-12 bezier
   strokes with per-stroke length/curl/wobble from the seed.
3. **Pointer reaction.** Track pointer (pointermove + touchmove, passive).
   Per figure per frame: factor f = max(0, 1 - dist/RADIUS) with RADIUS ~240;
   target rotation = atan2(dy,dx) * f * intensity * 1.4; lift = f * intensity
   (scales figure ~35% and raises ~10px). Lerp both at ~0.075 for butter.
4. **Controls.** Intensity slider (0-100 -> 0-1), light/dark theme toggle
   (swap two CSS variables), both in one bottom pill.
5. **Manners.** `prefers-reduced-motion` collapses intro durations; DPR-aware
   canvas (cap 2); ResizeObserver rebuild; controls appear only after intro.

## Quality bar

- 1px strokes only; two colors max (bg + ink); generous whitespace.
- 60fps on a mid phone: figures <= ~120, strokes per figure <= ~14.
- Verify visually at 1280 and 390 widths: intro legible mid-draw, reaction
  zone follows the pointer, controls reachable, no layout break.

## Anti-patterns

- No external CDNs/fonts/images (the file must work offline).
- No autoplay sound, no video, no canvas-to-dataURL exfiltration.
- No bundling private data into generated files; they get shared and hosted.
