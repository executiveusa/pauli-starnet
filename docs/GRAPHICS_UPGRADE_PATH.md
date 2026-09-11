# Graphics upgrade path — from pixel station to scroll world

Date: 2026-09-10. Sources: `executiveusa/pauli-scroll-world` (cloned and read),
`frontend/app/cityos.js`, Higgsfield pricing via scopeful.org (Aug 2026).

## Where the graphics actually stand

The city has two presentation layers today:

1. **The station renderer** (`frontend/app/world.js`, pixel-art canvas) — a real-time
   projection of runtime state. Functionally truthful, visually dated: flat 2D pixel
   tiles, small sprite set, no lighting, no camera work.
2. **The city web surface** (`frontend/city/`) — clean but deliberately plain HTML/CSS.

The engine for the upgrade already exists in the fleet: **pauli-scroll-world**. Its
`skills/scroll-world` builds scroll-scrubbed "fly through the world" experiences — as
you scroll, a camera dives from outside each scene into its interior, then flows to the
next scene with no cuts. `skills/scroll-studio` orchestrates when to use Scroll World,
the pinned ScrollCraft submodule, or a hybrid. This is what "scroll architecture" means
in this fleet's own vocabulary: the scroll-scrubbed continuous-camera world flight plus
the Scroll Media stage pipeline (`01_strategy … 08_learn`).

## Integration boundary (locked)

- **pauli-starnet stays the truth layer**: districts, buildings, agents, tasks,
  routing, receipts, approvals. The scroll world never invents state — it visualizes
  what the gateway proves.
- **pauli-scroll-world stays the presentation/media layer**: generated scene media,
  the frame-locked seamless chain, the portable scrub engine
  (`references/scrub-engine.js`, framework-agnostic vanilla JS), and the story contract
  (HOOK → TENSION → PAYOFF → ACTION) for audience-facing pieces.

Concretely: the city surface keeps its live data bindings; each district gets a
generated diorama scene; the scrub engine chains the 9 district scenes into one
continuous flight — outside the city, dive into Command, out, into Production, and so
on, ending at a hero scene with the owner CTA. Scroll position scrubs video time;
live status (seated agents, running missions) overlays as DOM on top of the video,
driven by the same `/v1/city/status` polling the plain surface already uses.

## Build order

1. **Interview + art direction** (scroll-world Step 1): subject = Pauli's Place; the
   journey = the 9 canonical districts in CityOS order; art direction default "soft
   matte low-poly clay diorama, isometric" with a neon-night alternative. One style
   preamble reused verbatim across all 9 scene prompts for cohesion.
2. **Scene stills**: 9 district images (+1 hero) generated per district's canonical
   purpose — Command/Heisenberg HQ, Software Factory, Revenue Center, Impact,
   Creative, Commerce, Intelligence, Experiment, Night Ops.
3. **Camera clips**: 9 dive-in clips + 8 connector clips, frame-identical seams (the
   skill's Step 5 chain — the single most common failure point).
4. **Mobile portrait chain**: a second native 9:16 chain (the skill requires this as an
   explicit choice — Jeremy watches from his phone, so yes).
5. **Wire the scrub engine** into a new route on the city surface, with the live
   overlay bound to gateway state and honest fallback when disconnected.
6. **Gauntlet**: scroll-studio's independent comparison pass before anything public.

## Cost shape (approval-gated, no spend yet)

Higgsfield pricing as of Aug 2026 (scopeful.org conversion of Higgsfield's own page):
credits run about $0.04–0.05 each; plans $19/mo (270 credits), $59/mo (1,200),
$129/mo (3,000); unused credits expire monthly. A 9-district run needs roughly 10
image gens (near-free to ~$0.20 each) + 17 video gens. At mid-tier models
(~$0.34–1.08/clip) one full landscape chain lands around $6–20 of credits; doubling
for the portrait chain plus one redo round puts a realistic first build in the
**$30–60** range — inside the $59/mo Plus tier. The scroll-world skill also notes a
Codex route where scene stills can bill to the existing ChatGPT subscription instead
of Higgsfield credits.

Zero-cost interim upgrade, no credits needed: swap the plain CSS surface for a
Three.js scene with the same live bindings (GPT-6 Astra has official, documented
strength building exactly this class of browser-native Three.js/WebGPU experience —
see OpenAI's "Building games with Astra"). That gets lighting, depth, and camera work
on live data before any generated media is bought.
