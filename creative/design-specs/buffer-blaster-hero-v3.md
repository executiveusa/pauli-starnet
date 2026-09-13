# Buffer Blaster hero v3 - awards-level candidates + CTA evaluation (2026-09-12)

Owner steering (voice note, driving, ~5:05 PM PT via Main): hero should be more like the
PostaStudios hero and reflect what BB actually does. Run the landing-page procedure:
correct copy, Collins-level design, proof elements. Produce a couple of front-page hero
versions - awards-level, very clear CTA. His CTA idea to evaluate: free trial, or let
visitors create one ad cheap/free. (Backend hardening "until completely perfect and ready
for real UGC work" is a separate builder workstream, not this doc.)

Format rule from the PS spec he likes: badge pill -> two-line headline with ONE accent
phrase -> one subline -> primary CTA + subordinate text link. Warm Studio Editorial
direction (v2 aesthetic ruling stands: no black, no sass). Copy in EN + es-MX, complete.

## Hero candidate A - product-truth led (the safe award play)

```
[pill]  RESEARCH -> SCRIPTS -> UGC ADS -> YOUR APPROVAL

H1:  Real product in.
     UGC ads out.                      (accent: "UGC ads")

Sub: Brief it once. Buffer Blaster researches your market, writes the hooks,
     and produces UGC-style video ads - and nothing ships or spends until
     you approve it.

[ Make your first ad free ]     See the workflow >
```

es-MX:
```
[pill]  INVESTIGACIÓN -> GUIONES -> ANUNCIOS UGC -> TU APROBACIÓN
H1:  Tu producto real.
     Anuncios UGC listos.              (acento: "Anuncios UGC")
Sub: Manda el brief una vez. Buffer Blaster investiga tu mercado, escribe los
     ganchos y produce videoanuncios estilo UGC - y nada se publica ni se
     gasta sin tu aprobación.
[ Crea tu primer anuncio gratis ]     Ver el flujo >
```

Why it can win: six words of headline, zero adjectives, the product IS the promise.
The contrast structure (in/out) reads in under two seconds and survives translation.

## Hero candidate B - outcome led (the bolder play)

```
[pill]  UGC AD CREATION - WITH THE RECEIPTS TO PROVE IT

H1:  Your next winning ad
     is hiding in your reviews.       (accent: "winning ad")

Sub: Buffer Blaster turns your product truth and customer signals into
     UGC-style video ads - researched, scripted, produced, and approved
     by you before a dollar moves.

[ Make your first ad free ]     See how it works >
```

es-MX:
```
[pill]  CREACIÓN DE ANUNCIOS UGC - CON RECIBOS QUE LO PRUEBAN
H1:  Tu próximo anuncio ganador
     ya está en tus reseñas.          (acento: "anuncio ganador")
Sub: Buffer Blaster convierte la verdad de tu producto y las señales de tus
     clientes en videoanuncios estilo UGC - investigados, escritos, producidos
     y aprobados por ti antes de mover un solo dólar.
[ Crea tu primer anuncio gratis ]     Ver cómo funciona >
```

Why it can win: the reviews angle is repo-true ("product truth, customer signals")
and no competitor says it. Risk: "winning ad" edges toward an outcome promise - the
gate must hold it as a headline about WHERE creative comes from, not a results claim.
If Synthia reads it as a performance claim, it dies (rule 5).

## Hero candidate C - trust led (governance, but warm)

```
[pill]  ONE SYSTEM: BRIEF -> AD -> APPROVAL -> RECEIPT

H1:  Every ad approved.
     Every dollar accounted for.      (accent: "approved")

Sub: Buffer Blaster makes UGC-style video ads inside one governed system -
     budget limits enforced at the server, your approval before anything
     publishes or spends.

[ Make your first ad free ]     See the proof >
```

es-MX:
```
[pill]  UN SOLO SISTEMA: BRIEF -> ANUNCIO -> APROBACIÓN -> RECIBO
H1:  Cada anuncio aprobado.
     Cada dólar contado.              (acento: "aprobado")
Sub: Buffer Blaster crea videoanuncios estilo UGC dentro de un solo sistema
     gobernado - límites de presupuesto aplicados en el servidor y tu
     aprobación antes de publicar o gastar.
[ Crea tu primer anuncio gratis ]     Ver las pruebas >
```

Why it can win: nobody in the AI-ads category leads with restraint. It keeps v1's
only good instinct (trust as differentiator) without the control-room mood. Risk:
reads "infrastructure" first - the 5-second blind test decides.

## CTA evaluation (his floated ideas, run through the procedure)

Repo facts that decide this: Stripe is TEST-MODE ONLY (owner pulled live activation
2026-09-10, "forget stripe for now"). Access models in the README are Managed Creative
Engine and Private Install - "not positioned as a low-cost public subscription." The
backend HAS server-owned wallets, budget enforcement, and approval gates - a capped
free-ad surface uses the product's own governance as the safety rail.

| Option | Verdict | Why |
| --- | --- | --- |
| Free trial | REJECT | Trial implies self-serve SaaS. Repo has no self-serve subscription surface; trial-of-what is incoherent against managed/private access models. Trial also implies time-limited admin of infrastructure - the worst first experience of this product. |
| Create one ad cheap | REJECT | "Cheap" reintroduces low-ticket pricing as the hook - Collins auto-reject, and Stripe is test-mode so "cheap" can't even be charged honestly. |
| Create one ad FREE | STRONGEST - with gates | Demos the real loop (brief -> ad -> approval -> receipt) instead of promising. Produces a proof artifact the visitor keeps. Mechanically aligned with the repo's own wallet/budget design. Free means free - no card, no Stripe, no test-mode weirdness in public. |
| Request access | FALLBACK | Honest and safe, but a form is not proof. Keep as the subordinate path. |

Proposal: primary CTA "Make your first ad free" (es-MX "Crea tu primer anuncio gratis")
behind FOUR guardrails:
1. MONEY GATE: every free ad costs real generation spend (measured reference: ~$0.86
   for the pipeline's first RunPod clip). Enabling this CTA is an owner decision with a
   server-side cap - one ad per lead AND a global daily free-ad budget. Nothing turns
   on without his explicit yes and the cap number he sets.
2. The approval step stays IN the free flow - the visitor experiences the gate, that's
   the product's differentiator, not a hurdle to remove.
3. Build dependency: a guest-safe public create path (capped, no account credentials,
   no client data) - real engineering, sequenced behind the backend-hardening
   workstream. The hero ships with the CTA only when the surface is true; until then
   the page ships "Request access" and the CTA swap is a one-line change.
4. No card collected. Free means free.

## Proof elements (his ask, repo-true only)

- DEMO STRIP under hero: BB-DEMO-1..3 real UGC ads from the pipeline (labeled
  placeholders until delivery - asset-slots contract).
- LIVE PRODUCT STATES: Pending approval / Budget limit reached / Receipt attached -
  real UI states from the Studio, not mock marketing cards.
- THE RECEIPT: one visual of an actual asset+approval+cost receipt (the repo's
  evidence object). No competitor can show this; it's the "proof elements" headline.
- WORKFLOW LINE: brief -> research -> scripts -> UGC production -> APPROVAL ->
  publish via PostaStudios -> receipt. One line, no chrome.
- OMIT: testimonials, logo walls, metrics, awards - none exist; fabricating any is an
  auto-fail.

## Gate additions for v3

- Headline read-aloud test: headline + subline must read clean in <= 8 seconds, EN and
  es-MX, no buzzwords (Collins generic-language reject).
- Candidate B's "winning ad" specifically reviewed as claim-vs-origin language.
- CTA honesty: if the free-ad surface is not live, "Make your first ad free" must NOT
  ship - shipping the CTA before the surface is true is fabrication-adjacent. Gate
  verifies the surface end-to-end before the CTA goes live.
- Synthia's gate owns the verdict between A/B/C.
