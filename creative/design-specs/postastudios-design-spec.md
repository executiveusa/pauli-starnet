# PostaStudios — Landing Design Spec (DARYA, 2026-09-12)

Bucket: Scale. Bar: tryitnow.ai **exact structure and wireframe** (LANDING-STANDARDS.md
Bar B). Copy rewritten for PostaStudios (AI UGC ad studio). New color scheme — full
rebrand, no TryPost/Postiz marks anywhere.

Repo target: `executiveusa/postastudios` (Postiz fork — upstream identity is dark UI with
violet/purple gradients; every trace of it gets replaced).

**Provenance note:** the standards doc's Bar B was recorded 2026-09-12 as tryitnow.ai's
verified structure (badge pill -> two-line hero -> two CTAs -> two-sides split -> product
spotlight -> 4 capability cards -> 3 workflow paths -> 4-step process -> closing CTA ->
footer). The live tryitnow.ai fetch today returns a different page (an "AI use-case
marketplace"). I build to the committed standards doc — that is the internal bar — and
flag the drift for the owner.

---

## 1. New color scheme: "Studio Editorial"

Rationale. The fork's inheritance (Postiz dark + violet gradient) is the exact uniform of
every AI-SaaS clone — Collins reject: "generic AI/SaaS language," and the visual version
of that sin is dark-purple-gradient. PostaStudios is a *studio*: it makes things for
people to watch. Editorial paper, ink, and one hot vermillion say "studio that ships
creative," not "another AI wrapper." It also photographs well next to real UGC video
(bright, warm, human) instead of swallowing it in dark chrome. Deep green is the
publishing/go signal. Every body-text pair is measured >= 4.5:1.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--ps-paper` | `#FAF6F0` | Page background | — |
| `--ps-ink` | `#17130E` | Text, dark sections, footer | 17.2:1 on paper |
| `--ps-vermillion` | `#C2410C` | THE accent: headline phrase, primary CTA, badge | 4.8:1 on paper |
| `--ps-vermillion-ink` | `#FFFFFF` | Text on vermillion buttons | 5.2:1 |
| `--ps-green` | `#1B4D3E` | Publishing/workflow-go accents, success states | 9.0:1 on paper |
| `--ps-muted` | `#6B6257` | Secondary text | 5.6:1 on paper |
| `--ps-line` | `#E4DCD0` | Hairlines, card borders | — |
| `--ps-paper-soft` | `#F3EDE3` | Alt-section background | — |

Rules: light-first (dark ink section allowed once, for the spotlight). One accent
temperature — vermillion; green only marks publishing/go. No gradients. No violet, no
Postiz purple, anywhere. Radius 10px cards, pill only for the hero badge. Type: a serif-
leaning display face for headlines (Fraunces or Instrument Serif) + Inter body — the
serif is the rebrand signature; upstream Postiz is pure geometric sans.

## 2. Wireframe — Bar B structure, section for section, copy rewritten

Nav: wordmark `PostaStudios` left; `Solutions · Studio · Contact`; primary CTA
`Start creating` right. EN/ES switcher visible.

**1. Hero**
- Badge pill: `AI UGC AD STUDIO`
- Two-line headline, accent phrase in vermillion:
  `UGC ads with AI actors` / `that your audience actually watches.`
  (accent on `AI actors`)
- Subline: `Brief it, cast it, approve it, publish it. PostaStudios turns a product
  brief into UGC-style video ads — with workflows and publishing built in.`
- TWO CTAs: secondary outlined `See workflows`, primary vermillion `Start creating`.

es-MX:
- Pill: `ESTUDIO DE ANUNCIOS UGC CON IA`
- H1: `Anuncios UGC con actores de IA` / `que tu audiencia sí quiere ver.` (acento en
  `actores de IA`)
- Sub: `Del brief a la publicación. PostaStudios convierte un brief de producto en
  videoanuncios estilo UGC — con flujos de trabajo y publicación integrados.`
- CTAs: `Ver flujos` / `Empieza a crear`

**2. Two sides split** — `Two sides of the studio`:
- `CREATE` — AI actors, scripts, generation. "Cast an actor, write the hook, generate
  the cut."
- `PUBLISH` — workflows + multi-platform distribution. "Approve once, publish everywhere
  your brand lives."

es-MX: `CREAR` / `PUBLICAR` with matching lines.

**3. Featured product spotlight: the UGC ads themselves**
- Dark ink section. Screenshot/demo carousel, 3-5 slots fed by the Video Dept pipeline
  (placeholder slots until real ads land — see shared/ASSET-SLOTS.md, PS-DEMO-1..5).
- Caption: `Real ads, made in the studio` — carousel items are the deliverable, not
  chrome. CTA under carousel: `Try the studio`.

**4. What we build — 4 capability cards**
1. `AI Actors` — cast consistent on-camera talent for your brand, no shoot days.
2. `Script to Ad` — brief in, hook-first scripts and storyboards out.
3. `Workflows` — generation, review, and approval as repeatable pipelines.
4. `Publishing` — schedule and ship to your social channels from the same place.

es-MX: `Actores de IA` / `Del guion al anuncio` / `Flujos de trabajo` / `Publicación`.

**5. Workflow orchestration — 3 illustrative paths** (illustrative, labeled as such):
1. `Launch` — new product -> 3 hooks -> 3 cuts -> approved -> scheduled.
2. `Testimonial` — review quotes -> actor-read testimonial -> brand-safety pass -> publish.
3. `Offer` — promo brief -> offer ad variants -> approval -> publish + pin.

es-MX: `Lanzamiento` / `Testimonio` / `Oferta`.

**6. How we work — 4 steps**: `Brief` -> `Generate` -> `Approve` -> `Publish`.
(Approve is its own step and stays its own step — human control is a feature, rule 6.)

es-MX: `Brief` -> `Generar` -> `Aprobar` -> `Publicar`.

**7. Closing CTA**: `Have a product to promote?` + `Start creating`.
es-MX: `¿Tienes un producto que promocionar?` + `Empieza a crear`.

**8. Footer**: explore (Solutions, Studio, Workflows) / product (Actors, Publishing,
Pricing-when-live) / legal columns; copyright; tagline `PostaStudios — ads made like a
studio, shipped like a system.` No TryPost/Postiz strings, assets, or marks.

## 3. Demo + team media

- PS-DEMO-1..5 carousel slots: 9:16 UGC video, poster + duration chip, explicit
  `UGC DEMO — CREATIVE PENDING` placeholders until the pipeline delivers. Contract in
  shared/ASSET-SLOTS.md.
- Team slots TEAM-1..4 (about/footer-adjacent band): initial-block placeholders,
  `data-slot` swap contract for tonight's photos. No invented faces.

## 4. Non-negotiables checklist

- [ ] Wireframe order exactly as Bar B, no section drift
- [ ] Zero TryPost/Postiz strings, marks, colors, or assets
- [ ] No manufactured metrics; placeholders labeled `PENDING`
- [ ] One primary CTA per viewport (hero has two CTAs: secondary stays outlined/subordinate)
- [ ] 320/390/430px clean, targets >=44px
- [ ] Contrast per token table; focus visible; alt everywhere; keyboard-complete
- [ ] EN complete + es-MX complete; lang, hreflang, visible switcher
- [ ] Zero console errors
- [ ] Independent Gauntlet screenshots 390/768/1440
