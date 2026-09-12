# Landing Page Standards - Max Digital Media family

Owner directive (Bambu, 2026-09-12, WhatsApp): maxfusion.ai is the bar for Buffer Blaster;
PostaStudios is rebuilt on tryitnow.ai's exact structure and wireframe with fixed copy and a
new color scheme; ALL landing pages pass an audit checker against these standards; the
Gauntlet (independent review) gates everything; English first, Mexican Spanish second.

## Reference bars (pulled live 2026-09-12)

### Bar A: maxfusion.ai (Buffer Blaster)
"AI Creative Layer for brands / agencies that scale" (hero wordmark animates between BRANDS and AGENCIES; title tag: "AI Creative Layer for Brands and Agencies") - verified live structure, top to bottom:
1. Announcement pill ("SEEDANCE 2.5 is LIVE!")
2. Hero: one headline naming category + audience, one subline stating the outcome
   ("Creative infrastructure for teams and agents that ship hundreds of winning ads a week"),
   ONE primary CTA ("Get Started" -> app sign-up)
3. Trust bar: "TRUSTED BY TOP MARKETERS WORLDWIDE" + client logo wall
4. Agent access: "Winning ads in your chat window" - MCP connect in 4 numbered steps,
   works with Claude/ChatGPT/Cursor/agents
5. Endorsements: named humans with roles + video proof
6. Workflow: "Research to scaling, in one flow" - connected steps on one canvas
   (Competitor Research, Trend Analysis, Ideation, Image, Video, Compositor)
7. Flagship spotlight: RIZZ model, one capability explained in plain language
8. Consolidation: "The old stack: one tool to spy, one to generate, one to edit - Maxfusion
   is all of them, A to Z"
9. Proof with numbers AND methodology footnote (464 vs 427 vs 233 ads, conditions stated)
10. Scale stats: 1,500+ ads/day, 10x faster, 80+ concepts weekly
11. Wall of love: dense testimonial grid, all named with roles
12. Nav: Home, Demo, MCP, Pricing, Enterprise + Log in/Sign up

Do NOT copy visual identity, claims, actors, layouts, assets, or pricing. Extract principles.
(Existing repo canon: buffer-blaster-/docs/MAXFUSION_GAUNTLET.md, DESIGN_GAUNTLET_V1.md,
FINAL_GAUNTLET_ADPANEL_BENCHMARK.md remain in force.)

### Bar B: tryitnow.ai (PostaStudios rebuild reference)
"AI products for people. Intelligent systems for businesses." - verified live structure:
- Nav: logo left; Solutions, Enterprise, Contact; primary CTA "Discuss a Project" right
1. Hero: small badge pill, two-line headline with one accent-colored key phrase,
   one subline, TWO CTAs (secondary "Solutions", primary "Discuss a Project")
2. "Two sides of the same company" split: Products for people | Solutions for business
3. Featured product spotlight (TryOnNow) with screenshot carousel + GET THE APP
4. "What we build": 4 capability cards (Agents, Automation, Recommendations, Multimodal)
5. Workflow orchestration: 3 illustrative paths (hotel guest agent, recruitment, commerce)
6. "How we work": 4 steps (Discover, Prototype, Integrate, Deploy & improve)
7. Closing CTA: "Have a use case in mind?"
8. Footer: explore/apps/legal columns, copyright, tagline

PostaStudios rebuild = this structure and wireframe exactly; copy rewritten for PostaStudios
(UGC ads as the featured demo); new color scheme; EN first, es-MX second.

## Universal rules (every landing page in the family)

1. LANGUAGE: English first, Mexican Spanish (es-MX) second. `<html lang>` correct,
   es-MX version reachable from every page (hreflang + visible switcher), translations
   complete - no untranslated blocks on the es-MX path.
2. FIVE-SECOND RULE: a first-time visitor can say what it is, who it is for, and the next
   action within five seconds. Hero = headline + subline + primary CTA, nothing else competing.
3. ONE NEXT ACTION: exactly one primary CTA per viewport. Secondary actions visually subordinate.
4. NO AI-SLOP COPY: capability-level language ("pull competitor ads from the Meta Ad Library"),
   never vague AI claims ("revolutionary AI-powered synergy"). No buzzword stacking.
5. TRUTH IN NUMBERS: no manufactured metrics. Any number carries its source or methodology.
   Placeholders must be explicit ("LIVE PROJECT LINK - PENDING"), never fabricated.
6. HUMAN CONTROL VISIBLE: where the product has approval gates, budget limits, or publishing
   control, the page says so. Trust is a feature; show it.
7. MOBILE: readable hierarchy at 320/390/430px, no horizontal overflow, touch targets >=44px.
8. ACCESSIBILITY: visible focus, contrast ratio >= 4.5:1 body text, every image has alt,
   full keyboard operation.
9. PERFORMANCE: page loads without console errors; no blocking third-party bloat.
10. COLLINS REJECT LIST (auto-fail any of):
    unclear primary audience or job; conflicting product names; low-ticket pricing as core offer;
    generic AI/SaaS language; unsupported performance claims; card/pill density that overwhelms
    hierarchy; mobile overflow/unreadable text/weak touch targets; inaccessible focus/contrast;
    no clear action after comprehension; builder self-approval without independent screenshot review.

## The gate

- The checker (`checker/landing-audit.mjs`) is the structural floor: necessary, not sufficient.
- Visual win requires independent Gauntlet review: blind comparison at 390/768/1440px against
  the bar, by a reviewer who did not build the page. Builder cannot self-approve.
- Verdicts: SHIP / HOLD. Only SHIP pages may be linked from the Max Digital Media proof page.
- Proof page integration: Netlify links are the live product links; entries go in the bucket
  the macsdigitalmedia editorial map assigns (Momentum / Scale / Launch / Built Here);
  new public entries need owner approval per macsdigitalmedia repo governance.
