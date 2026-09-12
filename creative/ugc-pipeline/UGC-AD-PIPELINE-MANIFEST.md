# UGC ad pipeline manifest - demo ads for the landing rebuilds

Status: DRAFT for Video Dept alignment (2026-09-12). Money gates: no paid generation runs
without per-job owner approval; RunPod spend stays prepaid-balance-only. Nothing publishes
without the gauntlet gate.

## Reality (Video Dept audit, 2026-09-12)

NO UGC workflow exists anywhere today. Montage is text+image/avatar-pipeline only.
PostaStudios (Postiz fork) has zero video capability. This manifest defines the NEW
ugc-ad pipeline's deliverable contract so the Video Dept builds toward a known target.

## Consumers (the slots that need real creatives)

Per creative/design-specs/asset-slots.md (the swap contract - the seam):

- Buffer Blaster landing: BB-DEMO-1, BB-DEMO-2, BB-DEMO-3 (Workflow section;
  each ad demonstrates a pipeline stage)
- PostaStudios landing: PS-DEMO-1 .. PS-DEMO-5 (featured-product carousel;
  each ad demonstrates a product/use case)

## Deliverable contract per slot

For EACH slot ID the pipeline delivers:

1. Master creative: 9:16 UGC-style video ad, H.264, <= 4MB, `preload="none"` friendly.
2. Derivative cuts: 4:5 (feed) and 1:1 (grid) from the SAME creative - per-ratio cuts,
   never CSS-reframed.
3. Poster frame: first strong frame (not a title card), AVIF or WebP, <= 150KB.
4. Truth metadata: real duration (for the `0:23` chip - a chip on an empty slot
   fabricates a spec), real content description for alt text.
5. Captions: EN + es-MX. BB captions name the pipeline stage demonstrated; PS captions
   name the product/use case. Pipeline swaps media only, not copy - copy ships with the
   page in both languages from day one.
6. Delivery record: JSON manifest mapping `data-slot` ID -> asset URLs + duration +
   alt + caption keys. Example:

```json
{
  "slot": "PS-DEMO-1",
  "state": "live",
  "video": {"9x16": "...", "4x5": "...", "1x1": "..."},
  "poster": "...",
  "duration": "0:23",
  "alt": {"en": "...", "es-MX": "..."},
  "caption_key": "ps.demo1"
}
```

## Publish handshake (the seam)

1. Video Dept produces creatives per this contract, drops assets + delivery JSON.
2. Builder swaps slot frame contents, flips `data-state: pending -> live`, sets
   poster/duration/alt from the delivery record. Zero layout change (that is the point
   of the slot contract).
3. landing-audit.mjs re-run on the page (structural floor stays green).
4. Independent gauntlet visual re-check at 390/768/1440 with the live media in place.
5. Only then: MACS proof page listing (Netlify links), per repo governance with owner
   approval for new public entries.

## Until delivery

Slots ship as explicit labeled placeholders (`UGC DEMO - CREATIVE PENDING (Video Dept
pipeline)` / es-MX `DEMO UGC - CREATIVO PENDIENTE`), no duration chips, no stock video,
no fake view counts. A placeholder is labeled as pending; we never invent people or specs.
