# Shared asset-slot contract — UGC demos + team photos (DARYA, 2026-09-12)

Both rebuilds ship with empty media slots that real assets drop into without layout
changes. Two rules above all: a placeholder is labeled as pending, and we never invent
people. No stock video passed off as product output. No AI-generated "team."

## 1. UGC demo ad slots (Buffer Blaster BB-DEMO-1..3, PostaStudios PS-DEMO-1..5)

Source of real assets: Video Dept pipeline (Montage + PostaStudios workflows).

Markup contract per slot:

```html
<figure class="ugc-slot" data-slot="PS-DEMO-1" data-state="pending">
  <div class="ugc-slot__frame"><!-- 9:16 video or poster --></div>
  <figcaption class="ugc-slot__caption">…</figcaption>
</figure>
```

- Aspect: 9:16 primary (UGC native). Derivatives 4:5 (feed) and 1:1 (grid) cropped from
  the same creative, never reframed by CSS `object-fit` guessing — deliver per-ratio cuts.
- `data-slot`: stable ID the pipeline targets on delivery. `data-state`:
  `pending | live`. Swap = replace frame contents + flip state + update caption/alt.
- Pending state (ships now): dashed 1.5px hairline frame, centered play glyph, label
  `UGC DEMO — CREATIVE PENDING (Video Dept pipeline)`, no duration chip (a chip on an
  empty slot fabricates a spec we don't have).
- Live state: poster frame (first strong frame, not a title card), duration chip
  (`0:23`), caption naming what the ad demonstrates (BB: the pipeline stage; PS: the
  product/use case). Muted autoplay on intersection, controls on tap, `prefers-reduced-
  motion` = poster only.
- Alt text, pending: `Placeholder for a UGC demo ad (pending from the production
  pipeline)`. Live: describe the actual ad content.
- Max weight: poster <= 150KB (AVIF/WebP), video <= 4MB H.264, `preload="none"`.

## 2. Team photo slots (both pages, TEAM-1..4)

Real photos arrive tonight (2026-09-12). Until then:

- 1:1 slots, 320×320 display (srcset 320/640/960 for retina), grayscale duotone
  initial-block placeholder: two-letter initials on `--surface` (BB) / `--ps-paper-soft`
  (PS), explicitly a placeholder — never a generated face.
- Same `data-slot` contract: `data-slot="TEAM-1"`, `data-state="pending"`. Tonight's
  swap is frame contents + alt, zero layout change.
- Live-state alt: `Firstname Lastname, role` — names and roles come from the owner with
  the photos; until then the slot carries no name (a name under an empty face is a
  claim we can't source).
- Delivery requirements for tonight: sRGB, >= 960×960, consistent crop guidance (head
  and shoulders, eyes on upper-third line) so the row reads as one team.

## 3. i18n note

Slot labels/captions ship in both languages from day one (EN + es-MX), so the pipeline
swap touches media only, not copy. Pending label es-MX: `DEMO UGC — CREATIVO PENDIENTE
(pipeline del Dept. de Video)`.
