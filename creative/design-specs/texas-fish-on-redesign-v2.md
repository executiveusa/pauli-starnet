# Texas Fish On - Collins-level redesign direction (v2) (2026-09-12, evening)

Owner verdict on v1 (9:02 PM voice note, via Main): "it looks really vibe coded." Redo to
the Collins-level landing standard, full gauntlet. Builder holds styling work; this spec
is the contract. Structure/content of v1 passed the gate 95% - the copy spine, claims
discipline, PBN mapping, es-MX register, and Bar B section map SURVIVE. What dies is the
skin and the hero architecture.

## Diagnosis: why v1 reads "vibe coded" (from the staged screenshots + source)

D1 DARK-FIRST. Entire page is navy (#0a232c). The owner already ruled for the family:
no black/dark-first, warm and legible (Buffer Blaster 3:58 PM ruling). v1 violates it.
D2 NO CHAT IN THE HERO. The owner's directive was "chat box IS the hero." v1's hero is
two buttons; the product sits in section 3 as a flat, low-contrast dark card. The one
thing the product IS does not appear above the fold.
D3 TEMPLATE RHYTHM. Every section repeats: caps kicker -> Archivo Black headline ->
3-4 uniform rounded cards -> repeat. Zero editorial variation; any AI page generator
produces this exact rhythm.
D4 TROPES: radial glow-blob gradients behind the hero, backdrop-blur glass pills,
999px pill radii everywhere, gradient CTA button, one generic 30px drop shadow.
D5 NO CRAFT LAYER: 0 SVGs, 0 icons, 0 imagery, 0 texture. Capability cards are bare
text blocks. Nothing on the page could only exist for a Texas fishing product.
D6 TYPE: Archivo Black shout on every headline; at 390px the hero wraps mid-accent
("Ask your fishing / agent."). All-caps kickers + shout = generic SaaS voice, not a
Texas field-guide voice.

## Direction: THE TEXAS ALMANAC

Concept: the page is a page from a well-made Texas fishing almanac - the paper annual
anglers already trust, talking back. Warm paper, ink, one water accent, one hot accent,
ruled lines, stamped check-dates, tabbed data entries. Every pixel argues the product's
claim (real sources, checked dates, plain language) instead of decorating it.

### Tokens
- Paper: #f6f1e7 (already in brand) with 3% grain/noise. Alt band: #efe6d3.
- Ink: #14303a (deep ink-navy; text, not background).
- Water: #156b5d (teal - links, data, selected states).
- Hot accent: #d97b4f reserved for ONE element per viewport (the primary CTA, the
  stamp). Never orange gradients.
- Rules: 1px ink at 12% opacity; double-rule section openers (almanac convention).
- Type: Fraunces (display serif, optical sizes, Google Fonts) for headlines - field-
  guide character, kills the SaaS shout. Archivo 400/500/600 for body (keep, drop
  Archivo Black entirely). IBM Plex Mono for ALL data: limits, dates, depths, tags -
  the almanac's data voice, and it makes the red-drum numbers look like law, not copy.

### Craft layer (what makes it Collins-level)
- Hand-drawn single-weight line illustrations (SVG): redfish, popping cork, jetty
  rocks, kayak, stringer. One per section opener, ink color, 1.5px stroke. This is the
  asset list for Darya - the page's "could only be Fish On" layer.
- Topo contour / bathymetric line watermark on the paper (2-3% opacity) in the hero
  and closing band - water without a stock photo.
- "Checked <date>" rubber-stamp treatment (mono, slight -2deg rotation, ink at 70%)
  on every sourced answer. The trust claim made visible.
- Waterbody entries styled as almanac tabs/ledger rows, not cards: hairline row
  separators, mono data columns (species, slot, bag, checked date).
- Hairline-map snippet of the Texas coast (single-weight SVG line) behind "every
  named waterbody" copy.

## Hero (the fix that matters most)

Two-column asymmetric at 1440, stacked at 390. Left: badge line (small caps mono,
"MADE IN TEXAS, FOR TEXANS"), Fraunces headline keeping the gate-passed copy
"Ask your fishing agent. Never Google a limit again." (accent italic on
"fishing agent"), one subline, secondary text link "See how it works".
Right, ABOVE THE FOLD: the chat composer - paper card, hairline border, real input
field ("Ask anything - Where are the reds running?"), and three tappable question
chips from the owner directive: "Can I keep this redfish?" / "Where near Houston this
weekend?" / "What's biting at the jetties?". Tapping or asking swaps in the sample
answer card: mono-source citation (TPWD Outdoor Annual), the "Checked <date>" stamp,
and the labeled disclaimer "Agent preview - sample answers from real Texas sources".
The 2-second test target stays: "a fishing agent for Texas you talk to."
Proof strip moves directly under the hero as a hairline ledger row (mono):
Regulations TPWD / Weather NWS / Tides NOAA CO-OPS / Flows USGS / Stocking TPWD -
names only, no glass pills.

## Section map (Bar B skeleton kept, rhythm broken)

1. Hero + chat (above).
2. Two-sides split - keep gate-passed copy, but as a single hairline-divided editorial
   band (anglers | businesses), not two glow cards.
3. The agent (chat deep-dive) - keep; render the conversation on paper with the stamp.
4. "One conversation covers the whole trip" - the four capabilities as almanac ledger
   rows with line illustrations, not a card grid.
5. Three Texans - as pull-quote strips (Fraunces italic quotes, mono attribution),
   not boxed cards.
6. Four steps - numbered almanac index with double-rule opener.
7. Regulations sample table (NEW, small): 3-row mono ledger - red drum / spotted
   seatrout / flounder with slot, bag, checked date. This is where the corrected red
   drum sentence lives (below). It is the strongest trust artifact the page can show.
8. Closing CTA + footer (keep footer claims discipline: TPWD non-affiliation,
   regulations-change disclaimer, affiliate disclosure - all gate-passed).

## Content must-fix (folded in): red drum over-slot

Verified against TPWD 2026-09-12
(https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/drum-bag-length-limits):
"one red drum over the stated maximum length limit may be retained when affixed with a
properly completed Red Drum Tag and one red drum over the stated maximum length limit
may be retained when affixed with a properly completed Bonus Red Drum Tag" - and tagged
fish count IN ADDITION to the daily bag.

Corrected sentence (EN, page + demo chat): "Texas red drum: 3 per day, 20-28 inch slot.
On top of your daily bag, TPWD allows two over-slot fish per license year - one with
your Red Drum Tag and one with a Bonus Red Drum Tag."
es-MX: "Róbalo rojo en Texas: 3 por día, talla ranurada de 20 a 28 pulgadas. Además de
tu límite diario, TPWD permite dos peces sobre la talla máxima por año de licencia:
uno con tu Red Drum Tag y uno con un Bonus Red Drum Tag."
(es-MX keeps the English tag names - they are TPWD document names, not translatable.)

## Rules that survive unchanged

Claims discipline (no metrics/testimonials/faces; preview labeled; no money copy),
PBN mapping from texas-fish-on-pain-inventory.md @ 6627f85 (PROVEN set drives hero,
NEW quarantined: NO catch-rate copy anywhere), EN first / es-MX second with visible
switcher + hreflang, builder never self-approves, blind 390/768/1440 screenshots vs
the bar, es-MX native read, SHIP + owner word before anything public. Name-collision
decision ("FishOn! Texas Guide Service", Matagorda) still parked with the owner.

## Gauntlet brief for this redesign

1. Verify every diagnosis item D1-D6 against the v1 screenshots (they must agree the
   tells are real, not taste).
2. Blind 2-second test on the new hero comp: "what is it, why do you care" - target
   answer unchanged. FAIL if the chat is not the visible star.
3. Aesthetic check against the owner ruling: light-first, warm, legible, serif display,
   one hot accent. FAIL on any glow blob, glass pill, gradient CTA, or dark-first band.
4. Verify the red drum sentence against the TPWD URL verbatim (both languages).
5. es-MX native read.
6. Collins audit: no fabricated anything; every number on the page is a cited TPWD
   limit or a checked date.
