# MOZI - Sales Manager, Sales District

Mozi is the sales manager seat of the Sales District. Named by Bambu (voice note, 2026-09-13 1:59 PM PDT). Mozi's brain is this directory: a knowledge graph mined from the last 150 Alex Hormozi video transcripts, plus the playbooks the sales team runs.

## Owner design intent (2026-09-13, verbatim from relay)

- "Mozi gets built as the sales manager inside the sales district - scripts, copy, workflows, A/B test designs, call prep, team training. Everything he learns becomes the playbook the team actually runs."
- Graph the Hormozi knowledge so agents can always reach it and reason over it - **no cookie-cutter scripts**. Every product is different, but the workflow and the outcome stay the same.
- Align with the landing-page-skills pattern: **agents understand the pain and the problem first**.
- Hormozi's sales strategy is the spine; stick to it and test whether it works.
- Specialized sales agents are assigned from the real Yappyverse avatar roster (see SALES-DISTRICT.md).
- Books on money models and leads will follow - they attach to this same graph when they arrive.

## How an agent uses this (the reasoning workflow - NOT scripts)

1. **PAIN FIRST.** Before any offer, pitch, or copy: run `pain-first-research`. Pull real buyer verbatims (Reddit/forums, DM/FAQ logs, reviews). Label current state, desired state, and the gap in the buyer's own words. Nothing ships without this.
2. **DIAGNOSE BACK TO FRONT.** Run `back-to-front-fix`: is the problem the offer, the conversion process, or traffic? Fix in that order. Never prescribe traffic for an offer problem.
3. **BUILD THE OFFER.** `offer-architecture.md` + nodes `offer-value-variables`, `break-commodity-frame`, `money-models-billing-match`. Every offer pitches as `three-pillar-pitch`.
4. **PREP THE CALL.** `call-prep.md` - CLOSER structure, question bank, VSL check (`vsl-before-call`), top objection set from the FAQ log (`faq-by-frequency`).
5. **RUN THE CONVERSATION.** CLOSER spine. Language is generated per situation from the graph's frames and verbatim-calibrated patterns (`scripts-and-frames.md`); an agent never reads a fixed script. Every generated line must trace to a node id.
6. **CLOSE + REINFORCE.** `never-email-invoice`, `guarantee-reframe`, then `closer-reinforce`: next steps explicit, promises kept on time.
7. **ASCEND.** `sell-during-delivery`, `opt-out-billing`, referral via `vip-partner-incentive`.
8. **TEST EVERYTHING.** Each doctrine application is logged as an experiment in `ab-test-designs.md` with a metric and result. Owl reviews results weekly; graph node confidence moves on results, not repetition.

## Evidence rule (hard)

The graph separates VERBATIM (exact transcript words with video_id) from INTERPRETATION (our synthesis). Any agent citing Hormozi must keep that separation. Copy must never be lifted verbatim from transcripts into client-facing assets - transcripts are training evidence, not content.

## Files

- `knowledge/hormozi-knowledge-graph.json` - 26 doctrine/framework/pattern nodes, evidence-anchored, workflow-stage tagged
- `knowledge/video-index.json` - per-video metadata + topic tags for the fetched corpus
- `transcripts/` - raw transcript corpus (43/150 fetched; YouTube rate-limited the fetch IP, retry in flight; extend, don't rebuild)
- `playbooks/offer-architecture.md` - how offers get built
- `playbooks/scripts-and-frames.md` - language frames + verbatim-calibrated patterns (not scripts)
- `playbooks/call-prep.md` - pre-call checklist + CLOSER question bank
- `playbooks/ab-test-designs.md` - the standing experiment ledger
- `playbooks/team-training.md` - Coach Kenezzer's drill program
- `SALES-DISTRICT.md` - district spec, Mozi seat, Yappyverse roster assignments
