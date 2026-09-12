# Gauntlet review brief: landing standards + audit checker

Independent review. The reviewer did not build these artifacts; the builder cannot
self-approve. Verdict per item (PASS/FAIL + evidence), then overall SHIP/HOLD.

## Targets
1. `creative/landing-standards/LANDING-STANDARDS.md` - the bar and universal rules.
2. `creative/landing-standards/checker/landing-audit.mjs` + `checker/pages.json` - the checker.
3. `creative/landing-standards/audits/2026-09-12-initial-audit.md` - the checker's first run.

## Checklist
1. BAR FIDELITY: the standards doc's Bar A structure matches the live maxfusion.ai and
   Bar B matches the live tryitnow.ai. Fetch both sites; compare section-by-section.
   FAIL if the doc invents sections or misstates the reference.
2. NO-CLONE RULE: the standards extract principles without directing anyone to copy
   maxfusion's visual identity, claims, actors, layouts, assets, or pricing.
3. OWNER RULES PRESENT: English-first/es-MX-second; five-second rule; one primary CTA;
   no manufactured metrics; independent review required; SHIP before proof-page listing.
   FAIL if any is missing.
4. CHECKER RUNS: `node checker/landing-audit.mjs` executes clean on Node 18+, zero
   dependencies, produces a markdown report, exits without errors.
5. CHECKER HONESTY: the checker fails broken pages (verify: it must HOLD the two 404
   Buffer Blaster Netlify sites and the redirect-looping PARE site) and passes a healthy
   page (macsdigitalmedia.netlify.app). Re-run and confirm the audit output matches reality.
6. CHECKER NECESSARY-NOT-SUFFICIENT: the checker is structural only and says so; it must
   not claim visual parity or replace the blind screenshot review.
7. SCOPE: pages.json covers every public landing page in the family (macs storefront,
   both Buffer Blaster candidates, PARE, Agent MAXX portal, Taste of Nawlins, ASC3ND,
   Posta Studio as pending) plus both bars marked role=bar. FAIL on a missing family page.
8. AUDIT REPORT ACCURACY: spot-check three rows of the initial audit against the live
   sites. FAIL if reported statuses don't match reality.

Overall: SHIP only if all 8 pass.
