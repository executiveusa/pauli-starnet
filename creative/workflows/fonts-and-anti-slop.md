# Workflow: fonts and anti-AI-slop (design gate)

Owner: Creative District design gate (Darya Designs + Synthia Superdesign).
Filed 2026-09-27 on his word: "add this as a workflow so they know where to find fonts and how to avoid ai slop." Source: the Refero design-tricks video he dropped the same night (25 tricks); paired reference: [styles-refero-design.md](styles-refero-design.md).

Every visual the gate ships runs this workflow. All sources below are free - house rule.

## 1. Fonts

- Source fonts from **Fontshare** and **Fontesk** (both free).
- Pair heading + body with **Fontjoy**.
- **Never ship an AI default font.** The default font is the #1 AI-slop tell. If the font choice took zero seconds, it is wrong.
- Log the font pair in the design brief with its source link.

## 2. Design system pick

- Use the **Refero gallery** (https://styles.refero.design/, 2,000+ AI-readable DESIGN.md systems).
- Shortlist the **top 3** systems closest to the brand's world.
- **Mix, don't copy**: type from one system, color/motion from another. Copying one system straight makes the brand a knockoff; mixing makes it its own world (Design Inheritance Law: preserve standards, forget style).

## 3. Component and asset libraries

- Components: **21st.dev**, **reactbits.dev**, **canvasui.dev**.
- Icons: **Iconify** / **FlatIcon** packs. **SVG-first** for icons and illustrations, always.
- Animated icons: **Lordicon** (Lottie).
- Master directory when hunting anything else: **creatorstoolbox.com**.
- UI law: **Apple HIG** governs layout and interaction decisions.
- Motion: **GSAP**.

## 4. Anti-slop audit (run before every SHIP verdict)

1. **Fonts**: no AI defaults (see 1).
2. **Hierarchy, spacing, type, accessibility**: audit all four before shipping; a fail on any one is a NOT MATCH.
3. **Copy**: study the top players in the niche and bake their copy patterns in. Banned-words list and tone-of-voice rules apply - no AI-speak, no filler hype.
4. **Grounding**: every claim on the page traces to supplied state or a cited source; unknown state renders as unknown, never filled in. (Cross-link: this is the same anti-slop principle as `missions/revenue/pauli-scroll-world-open-source.md` - grounded candidates only, explicit unknown over invented content. Scroll World applies it to generated scenes; the gate applies it to shipped visuals and copy.)

## 5. Verdict

The gauntlet loop rules unchanged: builder vs independent critic, MATCH/NOT MATCH with specifics, numbered rounds. This workflow is the checklist the critic scores against. "Live" never means "approved."
