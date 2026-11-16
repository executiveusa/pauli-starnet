# Creative District - context routing (Layer 1)

One job: design, video, UGC and post production behind the design gate.

Where do I go? Creative work in the city routes through this file. Read on entry to any creative seat or task (video, UGC, prompting, design, avatars).

## Knowledge bases this district uses

| Base | Pointer | Use it for |
|------|---------|------------|
| metricsmule-video (repo) | video/README.md -> knowledge/metricsmule-knowledge-graph.json | Video prompting doctrine, model formulas, realism, UGC production - cite by node ID |
| metricsmule playbooks | video/playbooks/ | prompt-generator system, seedance structure, realism doctrine, model formulas, ugc-influencer production |
| metricsmule transcripts | video/transcripts/<video_id>.txt | Verbatim evidence only when a citation needs exact words |
| metricsmule R2 mirror | https://video-exports.thepaulieffect.com/knowledge/metricsmule/ | Catalog TSV, bulk archive, external-fetchable copies |
| motionvideo (tool lane) | motionvideo/README.md | Motion graphics, explainers, showreels. Uses the user-level MotionVideo pack on the server (never copied into a repo) |
| dragualin-email-copywriter | email-copywriter/README.md -> knowledge/catalog.json | Email copy doctrine from the @dragualin archive (149 transcripts) - drafts and audits only, cite by video ID |

Proactive rule: agents on a creative task pull the nodes tagged for their workflow stage BEFORE drafting and cite node IDs in output. The README's usage routing ("PROMPTING A SCENE?", "SEEDANCE WORK?", ...) is the entry contract. Do not wait to be asked.

## Feeds

- Email copy: drafts, subject lines, opt-ins, welcome sequences, launches, audits route to `email-copywriter/` (draft-and-review-only; owner review before anything leaves).
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

## Agents

Roster: `districts/creative/citizens.yaml` (one home per agent; role, status, done-means and judge for each). Genfeed, Montage and the UGC studios join only after the draft-only content chain test passes.

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Post set | drafts with images, each approved before scheduling | owner |
| Video or UGC brief | script, hook and shot list matched to the offer | skeptic |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Publishing is always an owner approval.

## Knowledge

- `districts/pauli/board/seats/kallaway.md`
- .agents skill `ugc-creative-director` (`.agents/skills/ugc-creative-director/`)

## Standing jobs

Schedules fire only if the outcome is real; with nothing to do the agents sleep.

| When | Job | Outcome |
|---|---|---|
| weekdays 11:00 | Draft content due this week | drafts waiting in approvals |

## Human check

Bambú approves each post; reads one video brief a week.
