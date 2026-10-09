# Reference: reactbits.dev

Owner: Creative District design gate (Darya Designs + Synthia Superdesign).
Filed 2026-09-27 on his word: "https://reactbits.dev/ make them have accsess to this as will."
Crawl source: https://reactbits.dev/llms.txt (their agent-readable index, pulled 2026-09-27).

## What it is

React Bits is an open-source collection of animated UI elements: text animations, animations, components, backgrounds, and micro-interactions. The edgier end of component work - glass cards, cursor effects, particle text, scroll-driven reveals. Same family as 21st.dev but specialized in motion and high-end-site feel.

## Free vs paid

- **Free**: everything on reactbits.dev proper. 211 free components at crawl time:
  - 33 text animations (SplitText, BlurText, GradientText, DecryptedText, ...)
  - 40 animations
  - 46 components
  - 34 micro-interactions (switches, buttons, loaders)
  - 58 backgrounds
- **Paid**: React Bits Pro (150 pro components, 280 blocks, 300 app-UI screens, 15 templates, 20-agent kit). House rule is free tier first - the free library covers the gate's needs; do NOT pull Pro without surfacing it to him first.

## How the gate uses it

1. Browse the llms.txt index (or the site) for a component that fits the brief. Component page URLs are kebab-case: `/text-animations/split-text`, `/backgrounds/<name>`, etc.
2. Every component ships in 4 variants: JS+CSS, JS+Tailwind, TS+CSS, TS+Tailwind. Pick the variant matching the target repo's stack.
3. Install one of two ways:
   - shadcn CLI: `npx shadcn@latest add https://reactbits.dev/r/<Component>-<LANG>-<STYLE>` (e.g. `SplitText-TS-TW`)
   - jsrepo CLI: `npx jsrepo@latest add https://reactbits.dev/r/<Component>-<LANG>-<STYLE>`
   - or plain copy-paste from the component page.
4. **Check dependencies before use.** They vary per component (gsap, motion, three, ogl). Install what the component page lists.
5. Hand the picked component + variant + target file to the builder agent in the brief; the critic verifies it renders and matches the design system (tokens, fonts, colors from the Refero-mixed system).

## Anti-slop note

Motion is seasoning, not the meal. One animated element per viewport is a rule of thumb; stacking effects is its own slop tell. The audit in [../workflows/fonts-and-anti-slop.md](../workflows/fonts-and-anti-slop.md) scores the result.

## Links

- Site: https://reactbits.dev/
- Agent index: https://reactbits.dev/llms.txt
- Source: https://github.com/DavidHDev/react-bits
