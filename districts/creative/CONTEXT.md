# Creative District - context routing (Layer 1)

Where do I go? Creative work in the city routes through this file. Read on entry to any creative seat or task (video, UGC, prompting, design, avatars).

## Knowledge bases this district uses

| Base | Pointer | Use it for |
|------|---------|------------|
| metricsmule-video (repo) | video/README.md -> knowledge/metricsmule-knowledge-graph.json | Video prompting doctrine, model formulas, realism, UGC production - cite by node ID |
| metricsmule playbooks | video/playbooks/ | prompt-generator system, seedance structure, realism doctrine, model formulas, ugc-influencer production |
| metricsmule transcripts | video/transcripts/<video_id>.txt | Verbatim evidence only when a citation needs exact words |
| metricsmule R2 mirror | https://video-exports.thepaulieffect.com/knowledge/metricsmule/ | Catalog TSV, bulk archive, external-fetchable copies |

Proactive rule: agents on a creative task pull the nodes tagged for their workflow stage BEFORE drafting and cite node IDs in output. The README's usage routing ("PROMPTING A SCENE?", "SEEDANCE WORK?", ...) is the entry contract. Do not wait to be asked.

## Feeds

- UGC pipeline + gauntlet (realism doctrine is the scoring axis)
- Avatar/sprite work (Yappyverse character reference packs = consistency inputs)
- Faceless-channel plan (owner says it is next)
- Avatar World Builder: `avatar-world-builder/README.md` is the canonical composable-avatar workflow, parts catalog, source catalog, and release contract.

## Boundaries

- Verbatim vs interpretation separation preserved in every citation (graph evidence_rule).
- ASR name artifacts are documented in the README (C Dance = Seedance, Higsfield = Higgsfield). Never propagate mangled names into client-facing copy.
- No spend without owner approval: paid SaaS recipes (Higgsfield, Minimax, OpenArt) map to our fal/RunPod lane before use.

## YouTube System Agent
- Route business/client YouTube, faceless-channel, methodology-maintenance, and operator-training work through `video/youtube-system-agent/CLAUDE.md`.
- One agent selects one ICM workflow. Shared methodology and 20/20 transcript evidence live once under `_shared/`.
- `npm run test:youtube-icm` proves routing, contracts, gates and corpus completeness; it never publishes.
