# Hyperframe Station (creative district)

The desk where Darya and the creative agents make hyperframes and nothing else:
HTML/CSS/GSAP compositions rendered to deterministic MP4 with HyperFrames
(heygen-com/hyperframes, Apache-2.0, verified free - docs/RESEARCH.md).

## What it does

Any brand logo in, animated intro out.

- `compositions/intro-reveal/template.html` - the parameterized intro
  composition (Crown & Core pattern, reverse-engineered in docs/PATTERN-CROWN-INTRO.md).
- `compositions/intro-reveal/render.py` - brand.config.json in, MP4 out.
  Two logo modes: `svg` (stroke-draw, vector marks) and `beads` (raster/beadwork
  marks revealed dot-by-dot in radial order - the chaquira mode, built for the
  Kupuri flower).
- `samples/kupuri-media/` - the first real brand test: 281 beads extracted
  from Ivette's chaquira mark, rendered intro, placeholder tagline
  (TU ESLOGAN AQUI - awaiting her/his exact words; no agent-written copy ships).

## ICM architecture (how people understand it)

Same shape as the pauli icm-architect district, applied to creative production:

1. **Context map** - every job starts from a brand.config.json: logo, colors,
   wordmark, tagline, credits. One file = the whole brief. No config, no render.
2. **Pipeline** - ingest (config + logo asset) -> verify (lint + frame check)
   -> render (deterministic MP4) -> receipt (frames + usage + config hash).
3. **Human gate** - every output is a proposal. Nothing ships to a client or a
   site without the owner's sign-off (his design law + Collins protocol gates).
4. **Findings library** - every render leaves its config + frames under
   samples/ so the next brand starts from evidence, not memory.

Interpretation note: "ICM" here follows the city's existing icm-architect
pattern (evidence -> pipeline -> findings -> human review). If he means a
different ICM, rename once he says so.

## Rules

- Free lane first: HyperFrames CLI local render, $0. No paid render services.
- No agent-written client copy: placeholder text only until owner/Ivette words land.
- Raster logos: extract beads/paths to a checked-in intermediate (logo.beads.json)
  so renders are reproducible and inspectable.
- Every render attaches proof frames to its report (visual verification standard).
