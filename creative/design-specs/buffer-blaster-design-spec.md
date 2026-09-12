# Buffer Blaster — Landing Design Spec (DARYA, 2026-09-12)

Bucket: Momentum. Bar: maxfusion.ai **structure principles** (LANDING-STANDARDS.md Bar A).
We extract principles. We do not clone maxfusion's identity, actors, claims, layouts, assets,
or pricing. Buffer Blaster wins on its own wedge or it does not ship.

Repo target: `executiveusa/buffer-blaster-` (Next.js). Canon in force:
docs/MAXFUSION_GAUNTLET.md, docs/DESIGN_GAUNTLET_V1.md, docs/FINAL_GAUNTLET_ADPANEL_BENCHMARK.md.

---

## 0. Positioning (the wedge, said plainly)

Buffer Blaster is **private client creative infrastructure**: one governed system where an
agency's humans AND agents produce ad creative, with budget limits enforced at the server,
approval gates before anything publishes or spends, and evidence attached to the work.

What it is NOT: another AI ad generator, a wrapper, a $19 credit pack with a landing page.
Collins kills low-ticket pricing as the core offer. Pricing (verified test-mode offers
$19/3, $49/8, $99/20, $199/50 credits) lives on a subordinate Pricing section, never in the
hero, never as the pitch. Stripe is test-mode only — no "buy now" surface until the owner
flips it. Primary CTA is access-oriented, not purchase-oriented.

Five-second test answer: **what** — creative infrastructure you govern; **who** — agencies
running creative for clients; **next action** — Request access.

## 1. Visual identity (ownable, not maxfusion-derived)

Maxfusion reads as dark + vivid gradient consumer-AI. We go the other way: industrial
control room. The product's truth is governance, limits, approvals — the page should feel
like the instrument panel of something that spends money carefully.

Design tokens (all pairs measured, WCAG AA body-text pass):

| Token | Value | Use |
|---|---|---|
| `--bb-base` | `#0C0F14` | Page background (dark-first) |
| `--bb-surface` | `#151B26` | Cards, panels |
| `--bb-line` | `#232C3B` | Hairlines, borders, grid |
| `--bb-text` | `#E9EDF4` | Body/headlines (16.4:1 on base) |
| `--bb-muted` | `#9AA5B8` | Secondary text (7.7:1 on base) |
| `--bb-amber` | `#F5B32B` | THE accent: primary CTA, approval/gate states, active indicators |
| `--bb-amber-ink` | `#141007` | Text on amber (10.3:1) |
| `--bb-cyan` | `#7DD3FC` | Links/agent-related affordances only (11.5:1 on base) |
| `--bb-red` | `#F87171` | Denied/over-budget states only |

Rules: ONE accent (amber). Cyan is for agent/MCP affordances. Red is for gates that say no.
No gradients. No purple. Hairline grid texture (1px `--bb-line`, 64px pitch) as the only
background decoration — the "control room" cue. Radius 8px cards, 999px only for the
status pill. Type: Inter or IBM Plex Sans; numerals in IBM Plex Mono for budget/limit
readouts (mono = numbers you can audit).

## 2. Page structure (Bar A principles -> Buffer Blaster sections)

Bar A's twelve verified elements, applied as principles:

1. **Status pill** (Bar A #1 announcement pill): not a launch gimmick. Live-state pill:
   `v0.x — approval gates live`. Honest, versioned, changeable.
2. **Hero** (#2): headline names category + audience; subline states outcome; ONE primary
   CTA. See §3.
3. **Trust bar** (#3): we have no customer logos and we fake nothing. Replace logo wall
   with an integration/capability strip: "Runs with: Meta Ad Library · Hermes · MCP ·
   Claude · ChatGPT · Cursor" — capability language, all true to the build. Label it
   `BUILT TO PLUG INTO YOUR STACK`, not "TRUSTED BY".
4. **Agent access** (#4): "Your agents, on a leash." MCP/agent connect in 4 numbered steps
   (mirror the repo's real connect flow; Access page carries the full version). This is
   maxfusion's strongest section and the principle transfers: show the connect path,
   name the agents.
5. **Proof-by-state, not endorsements** (#5): we have no named endorsers. Do NOT fabricate
   testimonials. Replace with a **live product states** strip: three real UI states —
   `Pending approval`, `Budget limit reached`, `Receipt attached` — each with a one-line
   caption. This is the human-control rule made visible.
6. **Workflow** (#6): "Brief to receipt, in one flow." One connected canvas: Brief ->
   Generate -> Review (approval gate) -> Publish -> Receipt. Every node named after the
   real pipeline stage; the approval node is visually the hinge (amber).
7. **Flagship spotlight** (#7): one capability in plain language — the **server-owned
   budget limit**: "Set a cap once. The server enforces it. No agent, script, or tired
   human can spend past it." One panel, one diagram (limit set -> spend attempts ->
   hard stop), no numbers we can't source.
8. **Consolidation** (#8): "The old way: one tool to generate, one to approve, one to
   track spend, a spreadsheet to reconcile. Buffer Blaster is the system of record for
   all of it."
9. **Proof with methodology** (#9): skip until real numbers exist. Placeholder block,
   explicitly labeled `METRICS — PENDING REAL DATA`, never fabricated. Collins auto-fail
   otherwise.
10. **Scale stats** (#10): same rule. No 1,500-ads-a-day cosplay.
11. **Wall of love** (#11): omit. No invented humans. When real users exist, they go here.
12. **Nav** (#12): `Product · Access · Studio · Pricing · Docs` + `Log in` / **Request
    access** (primary). Canonical URL is an open owner decision
    (bufferblaster.netlify.app vs buffer-blaster.netlify.app) — NO absolute self-links
    hardcoded; use relative paths and env-driven canonical.

## 3. Hero (primary concept)

Five-second rule. Nothing competes with the one CTA.

```
[pill]  v0.x — APPROVAL GATES LIVE

H1:  Creative infrastructure your clients can trust.
Sub: One governed system for your team and your agents — budget limits
     enforced at the server, approvals before anything ships or spends.

[ Request access ]   (single amber CTA; secondary "See how it works" is a
                      plain text link, visually subordinate)
```

Right side: one compact panel (not a fake dashboard collage): a single approval card in
`Pending approval` state with `Approve` / `Reject` and a budget gauge at 68% of a labeled
cap. See mock asset `bb-hero-concept.png`.

Alt hero (for the gauntlet to compare): headline-led variant —
H1: `Your agents can create. You decide what ships.` Same sub, same CTA.

es-MX hero (complete, not partial):
```
[pill]  v0.x — PUERTAS DE APROBACIÓN ACTIVAS
H1:  Infraestructura creativa en la que tus clientes pueden confiar.
Sub: Un solo sistema gobernado para tu equipo y tus agentes — límites de
     presupuesto aplicados en el servidor y aprobaciones antes de publicar o gastar.
[ Solicitar acceso ]   secundario: "Ver cómo funciona"
```
`<html lang="es-MX">` on the es path, hreflang pair, visible EN/ES switcher in nav.

## 4. Demo media slots (UGC ads from the Video Dept pipeline)

Until Montage + PostaStudios deliver real creatives, slots ship as explicit placeholders
(rule 5: labeled, never fabricated). Full contract in shared/ASSET-SLOTS.md. Summary:

- Slot BB-DEMO-1..3 in the Workflow section: 9:16 video slots, poster frame + duration
  chip + caption naming the pipeline stage the ad demonstrates.
- Placeholder state: dashed hairline frame, `UGC DEMO — CREATIVE PENDING (Video Dept
  pipeline)`, alt text describing intended content. No stock video, no fake view counts.

## 5. Team photos

Placeholder slots per shared/ASSET-SLOTS.md (TEAM-1..4): 1:1, grayscale initial-block
placeholders, `data-slot` attributes for tonight's swap. No AI-generated fake faces —
an invented team photo is a manufactured-trust violation, same class as a fake metric.

## 6. Non-negotiables checklist (self-audit before Synthia's gate)

- [ ] One primary CTA per viewport; secondaries subordinate
- [ ] No absolute canonical URLs (owner decision pending)
- [ ] No pricing in hero; pricing section marked test-mode
- [ ] No metrics without source; pending blocks labeled
- [ ] No testimonials/logo walls of humans we don't have
- [ ] 320/390/430px: no overflow, targets >=44px
- [ ] Focus visible; contrast per token table; alt on every image; keyboard-complete
- [ ] EN complete, es-MX complete, lang/hreflang/switcher
- [ ] Zero console errors
- [ ] Screenshots at 320/390/430/768/1024/1440 captured for independent review
