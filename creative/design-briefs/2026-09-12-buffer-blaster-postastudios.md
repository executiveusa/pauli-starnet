# Design brief: Buffer Blaster + PostaStudios landing rebuilds

For: Darya Designs + Synthia Superdesign (gauntlet loop between you; best design wins)
Date: 2026-09-12
Owner directive: rebuild both landing pages to the bar in
`creative/landing-standards/LANDING-STANDARDS.md`. Run the gauntlet against each other until
both are production-ready and the heroes are done.

## 1. Buffer Blaster (bucket: Momentum)
- Bar: maxfusion.ai structure (see LANDING-STANDARDS.md Bar A - 12 verified sections).
  Do NOT copy its visual identity, actors, claims, or pricing.
- Own wedge to communicate: private client creative infrastructure; managed/dedicated
  deployment; one governed system for humans and agents; server-owned budget limits;
  approval gates before publish or spend; evidence attached to creative work.
- Hero must pass the five-second rule. UGC ad creatives (produced via the Video Dept
  pipeline: Montage + PostaStudios workflows) are the demo media - placeholder slots until
  the pipeline delivers real ads.
- Current state: both Netlify deploys 404 (fix in flight on a sibling branch: adds
  @netlify/plugin-nextjs). Canonical URL choice between bufferblaster.netlify.app and
  buffer-blaster.netlify.app is an owner decision - design must not hardcode either.
- Repo: executiveusa/buffer-blaster- (Next.js frontend). Existing canon:
  docs/MAXFUSION_GAUNTLET.md, docs/DESIGN_GAUNTLET_V1.md, docs/FINAL_GAUNTLET_ADPANEL_BENCHMARK.md.

## 2. PostaStudios (bucket: Scale)
- Bar: tryitnow.ai EXACT structure and wireframe (see LANDING-STANDARDS.md Bar B):
  badge pill -> two-line hero with accent phrase -> two CTAs -> "two sides" split ->
  featured product spotlight with demo carousel -> 4 capability cards -> 3 illustrative
  workflow paths -> 4-step "how we work" -> closing CTA -> footer.
- Copy: fixed, rewritten for PostaStudios (AI UGC ad studio: create UGC ads with AI actors,
  workflows, publishing). Featured demo = the UGC ads themselves.
- Color scheme: NEW (owner is redoing it; current fork carries upstream TryPost branding -
  full rebrand pass, no TryPost marks).
- Repo: executiveusa/postastudios. Live surface: Netlify (links go on the MACS proof page
  once proven).

## Both
- English first, Mexican Spanish (es-MX) second - complete translations, lang attributes,
  visible switcher.
- Team photo slots: placeholders for now; real team photos arrive tonight (2026-09-12).
- No manufactured metrics; numbers need source/methodology. No TryPost/Postiz branding.
- Mobile 320-430px readable, a11y (focus/contrast/alt/keyboard), no console errors.
- Gate: checker (landing-audit.mjs) then independent Gauntlet blind review at 390/768/1440
  vs the bar. SHIP required before proof-page listing.
