# Reference: every resource from the 25 design-tricks video

Owner: Creative District design gate (Darya Designs + Synthia Superdesign).
Filed 2026-09-27 on his word: "Extract all resources in the transcripts and make sure they have all 25 resources that they use."
Source: the design-tricks video transcript he dropped on WhatsApp 2026-09-27 22:49 CST (17,259 chars, full text in observations).

This is the complete accounting: **25 tricks, every resource named in each, free vs paid, and the fleet equivalent for the Claude-product-specific ones.** Tricks that are pure technique still list what the technique operates on. Cross-checked against [../workflows/fonts-and-anti-slop.md](../workflows/fonts-and-anti-slop.md) and [styles-refero-design.md](styles-refero-design.md) - no duplicates, this file is the superset index.

## Easy (1-7)

1. **Design systems** - Resource: Claude Design web app (claude.ai/design, design systems > create; turns a deck/site/screenshot into colors+fonts+components). Free with a Claude account. *Fleet equivalent: design-system briefs in `creative/` + the Refero-mixed system in the workflow.*
2. **2,000+ design styles** - Resource: https://styles.refero.design/ (2,000+ real, AI-readable design systems - Mercury, Linear, Apple). Free. Filed as [styles-refero-design.md](styles-refero-design.md).
3. **Top-3 shortlist** - Technique on the same Refero gallery (or any gallery): have the agent filter thousands of systems down to 3 closest to the brand. No new resource.
4. **Design systems as skills** - Resource: Claude Code / Claude Co-work custom skill (example: a `/duolingo` skill that produces that style every time). Claude product. *Fleet equivalent: this repo's workflows and skills - the gate's workflows ARE the skills.*
5. **Fonts** - Resources: **Fontshare** (free), **Fontesk** (free), **Fontjoy** (free pairing generator). Name the fonts in the prompt or upload the font file. House rule: never ship an AI default font.
6. **Copy that is not AI-speak** - Technique: study the top 5 players in the niche, bake their copy patterns into the design system. No new resource.
7. **Mix design systems** - Technique: type from one system, color/motion from another. Operates on Refero systems. No new resource.

## Intermediate (8-19)

8. **Images and video** - Resource: **KAI** (aggregator hosting most big image/video models in one place, pay-per-generation, among the cheapest providers). **PAID per generation.** *Fleet note: any paid generation lane needs surfacing to him first (money gate). Free-lane equivalents stay the default.*
9. **Reference a previous project** - Claude Design / Claude Code feature: paste a finished session's URL or name as the starting point. Claude product. *Fleet equivalent: reuse prior `creative/` outputs and briefs as the seed for the next job.*
10. **Curated reference library** - Resources: **Dribbble**, **Awwwards**, **X/Twitter** (all free to browse) + his own **Rubric References** Chrome extension (one-click save page + screenshot + note). *Fleet equivalent: a gate reference folder of saved winners the critic scores against.*
11. **Impeccable** - Resource: the **Impeccable** design skill - audits hierarchy, spacing, type, accessibility, empty states, then fixes them. Free skill. Already folded into the workflow's anti-slop audit (section 4, check 2).
12. **Tone-of-voice skill** - Resources: banned-words list + ready-made public standards: **ASD-STE100 Simplified Technical English** (free), **Google developer documentation style guide** (free), **Apple Style Guide** (free).
13. **21st.dev** - Resource: https://21st.dev community UI component library, built to hand straight to an agent (copy + paste + "use this component"). Free. Saves tokens vs designing from scratch.
14. **React Bits** - Resource: https://reactbits.dev - animated/edgy components (animated text, glass cards, cursor effects). Free (Pro tier paid - do not use without his word). Filed as [reactbits-dev.md](reactbits-dev.md).
15. **Canvas UI** - Resource: https://canvasui.dev - 35 unique effects (liquid glass, shatter, particle reveal). Free.
16. **Icons** - Resources: **Iconify** (free) and **FlatIcon** (free with attribution; paid license removes it) - download one whole pack in a single style, hand the folder to the agent.
17. **Ask for SVG** - Technique: request every icon/illustration/diagram as SVG - scales, hand-editable colors, animatable. No new resource.
18. **Lordicon** - Resource: https://lordicon.com - animated icons, thousands free, download as Lottie (animation baked in as code). Free tier.
19. **Creators Toolbox** - Resource: https://creatorstoolbox.com resources section - one directory of 150+ free design resources (animated components, 3JS effects, SVG icons, logo galleries, mockup kits). Free. The bookmark-if-only-one.

## Advanced (20-25)

20. **Apple HIG** - Resource: **Apple Human Interface Guidelines** (free) - layout, type sizes, tap targets, color. Turn into a skill so app screens follow Apple's rules instead of guesses.
21. **GSAP** - Resource: **GSAP (GreenSock Animation Platform)** (free) - the agency-standard JS animation library: scroll-driven sections, text reveals.
22. **/design command** - Resource: Claude Code's official `/design` command - canvas with editable artboards that knows the workspace, rules, and memory. Claude product. *Fleet equivalent: the gate's gauntlet loop (builder vs independent critic, MATCH/NOT MATCH).*
23. **Tweaks panel / tweak skill** - Resources: Claude Design's built-in **tweaks panel** (sliders for type, spacing, color) and the build-your-own **tweak skill** pattern (drop a slider panel on any HTML page, bake values back when done). Claude product. *Fleet equivalent: candidate fleet skill - a slider panel that bakes tokens back into the design system. Flagged as a build idea, not built.*
24. **Transcript to motion graphics** - Resources: **Whisper** (free, word-level timestamps) + **Hyperframes** (builds clips timed to transcript moments; external paid tool - verify before any spend). *Fleet equivalent: media-brain already indexes video; the motion-graphics lane itself is a future build.*
25. **Design operating system** - Build pattern: a micro app indexing every finished design, image, and video, plus an element library of reusable 3D assets, motion animations, and SVG icons. *Fleet equivalent: this `creative/` directory is the seed; the indexed element library is the end state.*

## Excluded (named in the video, not design-gate resources)

- The creator's PDF guide (lead magnet, link only in the video description - not available to file).
- The Robbernuggets community promo (paid community, not a design resource).

## Count verification

25 numbered tricks in the transcript: 7 easy + 12 intermediate (8-19) + 6 advanced (20-25) = 25. Every trick above lists its resource(s) or is marked as technique-only. All resources accounted for. Count verified 2026-09-27.
