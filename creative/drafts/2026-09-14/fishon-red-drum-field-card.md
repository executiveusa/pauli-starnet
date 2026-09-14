# DRAFT - Fish On: Texas Red Drum Field Card (mobile guide) - 2026-09-14
Status: DRAFT for review, $0 lane. Not published. Builds on redesign spec a8ceab8
(Texas Almanac direction) and pain inventory 6627f85.

## Validation (honest, thin-data noted)
- Direct demand evidence is thin from tonight's scan (no strong Etsy/Gumroad comps
  surfaced). Indirect demand is strong: Fishbrain built a $100/yr business on exactly
  this job (what/where/when/limits) and its users' loudest pains are paywall creep and
  wrong data (pain inventory P1/P2). A free, source-linked, printable field card is the
  sharpest wedge product: it demonstrates Fish On's two claims (accuracy, free-first)
  with zero app install.
- Competitor gap: no major free Texas-specific, TPWD-cited, dated field card exists;
  TPWD's own Outdoor Annual is authoritative but 100+ pages and not pocket-formatted.

## Product shape
One mobile-first card (HTML page, print-to-PDF friendly), Almanac visual language
(Fraunces + IBM Plex Mono data voice, paper/ink, checked-date stamp). Sections:

1. THE NUMBERS (mono ledger, the whole point):
   - Daily bag: 3 per person/day
   - Slot: 20 in min - 28 in max
   - Over-slot: up to TWO per LICENSE YEAR - one with a Red Drum Tag, one with a
     Bonus Red Drum Tag; tagged fish count IN ADDITION to the daily bag
   - Source + "Checked 2026-09-14" stamp, linked:
     https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/drum-bag-length-limits
     (re-verified live tonight against the page)
2. MEASURE IT RIGHT: slot measured as total length; link to TPWD measurement page
   (claim to verify at build time - do not paraphrase without the fetch).
3. THE TAGS: Red Drum Tag comes with the saltwater endorsement; Bonus tag is a
   separate purchase; how tagging works (link to TPWD tagging page, verify at build).
4. WHERE (no spot-burning, no guarantees): habitat guidance only - "reds work
   shorelines, grass flats, and pier/jetty structure; check tides and wind" -
   general knowledge, no specific spots named, NO "they're stacked at X" language.
5. WHEN: solunar/season generalities phrased as tendencies, never promises.
6. ASK THE AGENT: handoff into Fish On chat ("What's the slot on reds again?" ->
   sourced answer) - the card is the funnel, the agent is the product.
7. Footer: TPWD non-affiliation, regulations-change disclaimer, checked date.

## Claims discipline (hard rules for this card)
- EVERY number is a cited TPWD limit with a checked date; nothing else quantitative.
- No catch-rate, success, or "guaranteed" language anywhere (quarantined per PBN P8).
- No specific fishing spots named (spot-burning is a proven community pain - P4).
- es-MX version ships with the card (program rule EN first / es-MX second).

## Remaining build-time verifications (must fetch before publish)
- TPWD total-length measurement page
- TPWD tagging instructions page
- TPWD license/endorsement page for tag inclusion language
