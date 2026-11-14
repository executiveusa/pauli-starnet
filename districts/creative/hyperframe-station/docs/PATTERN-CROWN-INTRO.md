# Crown & Core intro - reverse-engineered pattern

Source: 12s MP4 cooked by the Opus 5.5 session (pure code + CSS, no video
editor). Source files not found in crownandcorestarnet (main @1836787) or
crown-and-core - the composition lived in the Opus session and was not pushed.
The pattern below is reconstructed from frame analysis (fps=1 frame pulls) and
is what intro-reveal/template.html implements.

## Frame-by-frame breakdown (12s, 1920x1080)
| t | beat | technique |
|---|------|-----------|
| 0.0-0.4 | black hold | - |
| 0.4-2.8 | mark draws itself | SVG stroke-draw: stroke-dasharray=len, dashoffset len->0, thin gold stroke, per-path stagger |
| 2.4-3.6 | mark fills + glow | fill-opacity 0->1 (gold->cream), radial-gradient bloom fades in behind (blur) |
| 3.3-4.6 | wordmark | "CROWN & CORE" fades + rises, letter-spacing tightens (0.44em -> 0.30em) |
| 4.3-5.2 | accent rule | gold underline scaleX 0->1 |
| 5.1-6.2 | tagline | italic serif line fades up ("The direction we recommend") |
| 6.1-7.2 | credits | letterspaced caps line fades ("PREPARED FOR LETHIA - MACS DIGITAL MEDIA") |
| 7.2-12 | hold | subtle glow pulse (yoyo), clean end frame |

## Why it works
- One element at a time earns attention (hierarchy, Collins motion rule).
- The draw-on makes a static logo feel hand-made - craft signal.
- Restraint: one rule, one tagline, one credits line. Nothing decorates.

## Adaptation for raster/beadwork logos (Kupuri chaquira)
A beaded mark has no strokes to draw. Equivalent craft-true beat: reveal the
mark bead-by-bead in radial order from center (the way chaquira is actually
made), back.out(2.2) pop, ~1.9s for ~281 beads. Bead positions + true colors
are extracted from the logo PNG once (Hough circle detection + top-quartile
saturation sampling) and checked in as logo.beads.json for reproducibility.
