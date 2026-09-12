# Buffer Blaster repositioning v2 (2026-09-12, owner voice-note steering)

Owner steering (voice note, ~3:58 PM PT, relayed verbatim through Main):
Buffer Blaster should really be the UGC CREATION product - redo hero + positioning to
reflect what the repo/product actually does. "I don't like the black, I don't like the
sassy look" - he wants it to read like the PostaStudios Studio Editorial direction:
understandable, warm, legible. PostaStudios stays the SCHEDULING product (Postiz fork;
skin + copy reposition only, no backend changes). "Run it back through our landing page
workflow again and be a lot harder on that."

This doc supersedes the positioning and visual-identity sections of
design-specs/buffer-blaster-design-spec.md (v1). v1's process rules survive: no fabricated
proof, labeled placeholders, asset-slot contract, non-negotiables checklist.

## 1. Repo truth (what Buffer Blaster actually is - verified 2026-09-12)

From executiveusa/buffer-blaster- README (default branch):
- "turns product truth, customer signals, and brand context into testable creative work"
- Core loop: product+customer context -> research and angles -> **scripts / UGC production
  plan** -> human review -> paid generation within server-owned limits -> asset + approval
  + cost evidence -> optional publishing/paid-media -> next iteration
- Core capabilities (verbatim): campaign and creative planning; **structured UGC-style
  video production**; provider-neutral media generation; client/workspace persistence in
  self-hosted Supabase; server-owned generation-budget enforcement; explicit approval
  gates for paid generation and publishing; Shopify attribution; Meta/TikTok paid-media
  experiment adapters; optional downstream social publishing; the same workflow through
  Studio UI, REST, MCP, and CLI.
- The repo's own Proven-Better-New record (docs/PROVEN_BETTER_NEW.md) already says:
  "Buffer Blaster should own creative intelligence and governance, not become a generic
  scheduler" and names Buffer/publishing as a downstream ADAPTER.

Verdict: the owner's steering matches repo truth. UGC-style ad creation IS the product.
Governance (approvals, budget limits, receipts) is the trust layer, not the identity.
v1 made governance the identity ("control room") - that is the repositioning error.

Product split across the family (now explicit):
- Buffer Blaster = CREATE UGC ads (research, scripts, AI production, approval, evidence)
- PostaStudios = SCHEDULE + publish (the distribution lane)

## 2. New positioning

One line: **Buffer Blaster makes UGC-style video ads from your product truth - with
human approval and spend limits built in, and publishing handled by PostaStudios.**

Five-second test: WHAT - UGC ad creation; WHO - brands/agencies selling products;
NEXT ACTION - see real ads / request access.

Claims discipline (harder gate, per owner): every capability sentence on the page must
trace to a repo capability listed in section 1. No "learn what works" promises without
live-evidence qualification (PBN NEW #3). No volume-as-promise (CreativeLaunch graveyard
signal). Pricing stays subordinate, test-mode labeled.

## 3. Hero v2 (EN + es-MX)

```
[pill]  UGC AD CREATION + APPROVALS IN ONE SYSTEM

H1:  UGC video ads, made from your product truth.
Sub: Brief it, and Buffer Blaster researches, scripts, and produces UGC-style
     video ads - you approve every ad before anything ships or spends.
     Publishing runs through PostaStudios.

[ Request access ]   (primary)   See real workflow > (subordinate text link)
```

es-MX:
```
[pill]  CREACIÓN DE ANUNCIOS UGC + APROBACIONES EN UN SOLO SISTEMA
H1:  Videoanuncios UGC hechos a partir de tu producto.
Sub: Manda el brief y Buffer Blaster investiga, escribe y produce videoanuncios
     estilo UGC - tú apruebas cada anuncio antes de publicar o gastar.
     La publicación corre por PostaStudios.
[ Solicitar acceso ]   Ver el flujo real >
```

Alt hero for the gate to compare:
H1: `You approve every ad. Nothing spends without you.` (governance-forward, still
UGC-led in the sub).

Demo media: BB-DEMO-1..3 slots (asset-slots contract) move UP - the UGC ads are the
product's output, so the demo strip sits directly under the hero, not buried in Workflow.

## 4. Design direction v2 (the owner's aesthetic ruling)

NO: black control-room, dark-first, "sassy" attitude, purple AI-SaaS gradients.
YES: the Studio Editorial family direction - warm, legible, understandable (same family
feel as PostaStudios v1 spec: paper, ink, editorial type, one hot accent).

Guardrails for the designer (exact tokens are the designer's call within these):
- Light-first, warm paper background (family cousin of --ps-paper, may vary in hue so
  the two products are distinguishable side by side on the proof page).
- Ink text, one accent (BB may keep an amber/orange-family accent in LIGHT mode - it was
  the dark room, not the amber, he rejected - designer confirms against mock).
- Editorial display type for headlines (serif-leaning like PS, or warm grotesque -
  designer picks ONE and justifies), Inter-class body.
- The governance surfaces (approval card, budget gauge) stay - restyled warm, as the
  trust/proof elements, not the page's mood.
- 320/390/430px clean, WCAG AA, no console errors - unchanged.

## 5. Structure (Bar A principles, re-lead for UGC)

Bar A's 12-section structure still applies; content re-leads:
1. Pill: product truth (UGC creation + approvals), versioned
2. Hero v2 (above)
3. DEMO STRIP (new prominence): BB-DEMO-1..3 - the ads themselves
4. Trust bar: integration strip (Meta Ad Library, Hermes, MCP, Claude, ChatGPT, Cursor)
   - capability language, labeled BUILT TO PLUG INTO YOUR STACK
5. Workflow: brief -> research -> scripts -> UGC production -> APPROVAL -> publish via
   PostaStudios -> receipt. Approval node visually the hinge.
6. Agent access: "Your agents, on a leash" (MCP 4-step, from repo Access flow)
7. Trust layer (governance, one section, not the identity): server-owned budget limits,
   approval gates, receipts - the v1 flagship content, demoted to section
8. Consolidation: research + scripts + production + approvals + evidence in one system;
   scheduling deliberately NOT here (PostaStudios owns it - say so; it sharpens both)
9. Proof/metrics: PENDING REAL DATA blocks only
10. Wall of love: omit until real users
11. Pricing: subordinate, test-mode labeled
12. Nav: Product - Workflow - Access - Pricing - Docs + Request access

## 6. Harder gate (owner: "be a lot harder on that")

Added to the normal checker + blind review:
- REPO-TRUTH CITATION: reviewer maps every capability claim on the page to the section-1
  list; any untraceable claim = FAIL.
- POSITIONING DRIFT: page must read as UGC CREATION in a 5-second blind test; if the
  reviewer summarizes it as "infrastructure/governance platform" first, FAIL.
- AESTHETIC RULING: any dark-first page, control-room framing, or sass = auto-FAIL.
- FAMILY SPLIT: if the page presents scheduling/publishing as Buffer Blaster's own
  product (rather than PostaStudios'), FAIL.
- Synthia's gate (agent-01M2BVWRAB31XJ79F89FDHD5DZ) owns verdicts, per Main.
