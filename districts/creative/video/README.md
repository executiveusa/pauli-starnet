# VIDEO LANE - Creative District

The video team's brain for AI video production: a knowledge graph mined from the 150 most recent MetricsMule transcripts (293,825 words), the channel's published prompt library, and the Watcher's frame-level visual pass. Sits in the Creative District next to the design house (Darya + Synthia) and feeds the UGC pipeline, the gauntlet, and the faceless-channel plan.

## Owner design intent (2026-09-13, verbatim from relay)

- "Learn and save all this as well for the video team. Extract and tell the watcher to visually take a look as well to see what's possible. Assign this to the proper district and agents."
- "Hardcode the process and store what you learned and save it inside the district as a callable database use the icm method city wide."
- Feeds the faceless-channel plan Bambu says is coming next.

## How an agent uses this

1. PROMPTING A SCENE? Do not hand-write. Run the generator workflow in `playbooks/prompt-generator-system.md` - load the model's guide + this graph into the LLM and generate. Every prompt traces to a graph node id.
2. SEEDANCE WORK? `playbooks/seedance-structure.md` is law: timestamps, global lock, one camera movement per block, reference stacks.
3. REALISM CHECK? `playbooks/realism-doctrine.md` - the gauntlet scores against it (captured-not-created, meta-token stacks, genre sets).
4. UGC / AI INFLUENCER? `playbooks/ugc-influencer-production.md` - 2-step influencer formula, product placement, extend, ensembles, preset libraries.
5. MODEL-SPECIFIC FORMULAS? `playbooks/model-formulas.md` (Veo 3.1, Kling 3.0, Nano Banana JSON).
6. PRE-FLIGHT: `moderation-playbook` node - filmmaker language only, no real identifiable faces, no trademarked IP in client work.

## Evidence rule (hard)

The graph separates VERBATIM (exact transcript words with video_id, or site-prompt text with URL) from INTERPRETATION (our synthesis). ASR mangles product names: "C Dance"/"Cance" = Seedance, "Higsfield" = Higgsfield, "Cinema Studio 2.5" naming is his. Transcripts are training evidence, never client-facing copy.

## Reconciliation vs Watcher visual pass (2026-09-13 2:13 PM)

Overlap mapped in node `watcher-visual-patterns`. Visual-only adds (not in transcripts): real+AI composites, overlay system, props/sets. Transcript-only adds (not visible in frames): prompt-generator meta-workflow, moderation playbook, realism meta-token doctrine, model formulas, reverse-engineering workflow, preset/monetization intel. Nothing duplicated; each cites the other.

## Files

- `knowledge/metricsmule-knowledge-graph.json` - 15 doctrine/framework/pattern nodes, evidence-anchored, workflow-stage tagged
- `knowledge/video-index.json` - per-video metadata + topic tags, 150 videos
- `transcripts/` - raw corpus, 150/150 fetched, zero misses
- `playbooks/` - the five working playbooks above
- `METRICSMULE-LEARNINGS.md` - the high-level extraction (what the channel teaches, what we fold in)
- `VIDEO-LANE.md` - lane spec and ownership (PROPOSED, awaiting Bambu's approval)
- Mirror copy for quick fetch: https://video-exports.thepaulieffect.com/knowledge/metricsmule/
