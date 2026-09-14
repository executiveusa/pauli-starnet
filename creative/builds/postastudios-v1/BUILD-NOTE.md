# PostaStudios v1 product site (2026-09-13)

Status: staged build for deploy + gauntlet. Builder: landing-standards agent. NOT self-approved.
Driver: owner steer via Main (6:12 PM) - Posta must be a clickable product site on the MACS
demos page; scheduling-led per the owner's 3:58 PM family split (PS = SCHEDULING, never backend
changes). This v1 is a STATIC marketing site; no live app deployment exists to link, so the
CTA is request-access (mailto), not a fake signup.

Structure: Bar B (tryitnow.ai wireframe per LANDING-STANDARDS.md): badge pill -> two-line hero
-> 2 CTAs -> proof strip -> two-sides split -> product spotlight -> 4 capability cards ->
3 workflow paths -> 4-step process -> closing CTA -> footer. EN first / es-MX second, visible
switcher + hreflang both directions.

Visual: Studio Editorial palette from Darya's spec (paper #FAF6F0, ink #17130E, vermillion
#C2410C, green #1B4D3E), Fraunces display + Inter body, light-first with one ink spotlight
section, no gradients, no Postiz/violet marks anywhere. Owner aesthetic ruling honored.

Claims map (every claim cites executiveusa/postastudios README, read live 2026-09-13):
- "one calendar / month, week, day views / drag-and-drop rescheduling" - README feature table
- "publish natively to 12 networks" - README tagline + table
- "AI copilot with brand profile (tone, voice, language, colors)" - README table
- "automations: schedule, RSS, webhooks, AI steps, server-side" - README table
- "workspaces, roles, approval flows" - README table
- "MCP server + REST API" - README tagline
- "self-host or cloud" - README tagline
- "AGPL-3.0 open-source base" - README license badge
Claims discipline: no metrics, no testimonials, no logos, no faces, no money copy. The
calendar mock is visibly labeled "Studio preview - sample plan" (EN) / "Vista del estudio -
plan de muestra" (es-MX) with a caption stating it is not a live account.

Audit (landing-audit.mjs, run locally 2026-09-13): EN STRUCTURAL-PASS zero fails; es-MX
STRUCTURAL-PASS zero fails (after checker fix below).

Checker fix (shipped in this commit): CTA_WORDS regex was English-only, so every correctly
translated es-MX CTA false-failed (first hit by the Fish On build, flagged for standards-owner
adjudication). Extended with Spanish CTA vocabulary. Root-cause fix in the checker, not in copy.

NOT in v1 (honest edges): no live app link, no real screenshots (no deploy to capture), no
pricing, no blog/docs, hello@postastudios.com mailbox assumed from domain convention - VERIFY
that mailbox exists or swap the CTA target before the URL goes public.

## v2 update (2026-09-13, 6:52 PM owner directive via Main)
- Rebrand sweep: zero TryPost/Postiz/template/lorem references (grep-verified; the only
  upstream mention is the AGPL-3.0 license line, kept deliberately for license honesty).
- Dead mailto CTA (postastudios.com has no DNS) REPLACED with a real inquiry form
  (name/email/networks/message + honeypot) posting to /api/inquiry.
- Backend: api/inquiry.py, stdlib-Python-only service, tested live: valid POST stores
  one JSONL line, honeypot silently drops, bad email 422, no-JS form POST works.
- Deploy target changed Netlify -> VPS srv1099662 via the watcher; DEPLOY.md in the
  bundle carries the layout, systemd unit, nginx sketch, and verification curls.
- Owner said "make the sensible calls" - recorded: wordmark stays "PostaStudios"
  (established everywhere; the voice-note "Posta Studios" spacing reads as STT);
  inquiries STORE to jsonl only (no mailbox exists anywhere; forwarding waits on the
  owner picking a destination); Google Fonts is the only external asset.
- Re-verified: audit STRUCTURAL-PASS both languages; form + accents visually inspected
  at 390/768/1440 in both languages.
