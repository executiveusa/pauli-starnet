# hairline-animator

One idea in, one self-contained HTML file out: clean hairline (1px) line-art
animations that react smoothly to the visitor's cursor or finger. Built for
brand intros, hero sections, decks and pages that need a living drawing
without video, accounts, or server cost - everything renders client-side in
the viewer's browser.

Origin: technique demoed in Nick Automates' short "Claude Can Now Make Smooth
Animations That React to Your Cursor with just one Prompt" (2026-10-17);
ordered into the district by Bambu the same day with the INDIGO AZUL intro as
the first build.

## Use

Read `skills/hairline-animation.md`, then generate. The reference
implementation (`skills/reference/indigo-azul.html`) is the working bar:
intro draw-on of the brand wordmark, isometric tillandsia rosette field,
pointer-reactive rotation + lift with lerp smoothing, intensity slider,
light/dark toggle, mobile touch support, reduced-motion respect.

## Gates

- Mode: draft-and-review-only. No automations, no schedulers, no deploys.
- Output is one portable HTML file per idea; nothing is published from here.
- No external assets, fonts, CDNs, or network calls inside generated files.
