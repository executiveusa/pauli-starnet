# Sales District - context routing (Layer 1)

Where do I go? Sales work in the city routes through this file. Read on entry to any sales seat or sales-adjacent task (offers, calls, objections, retention, referrals, pipeline).

## Knowledge bases this district uses

| Base | Pointer | Use it for |
|------|---------|------------|
| mozi-sales (repo) | mozi/README.md -> knowledge/hormozi-knowledge-graph.json | Doctrine, frameworks, patterns - cite by node ID |
| mozi playbooks | mozi/playbooks/ | offer architecture, scripts-and-frames, call prep, A/B tests, team training |
| mozi transcripts | mozi/transcripts/<video_id>.txt | Verbatim evidence only when a citation needs the exact words |

Proactive rule: agents working a sales task pull the nodes tagged for their workflow stage BEFORE drafting, and cite node IDs in their output. The stage->node mapping lives in the graph (`applies` arrays) and knowledge-index.json. Do not wait to be asked.

## Seats -> default knowledge hooks

| Seat | Loads first |
|------|-------------|
| Kenezzer (training) | playbooks/team-training.md + graph nodes applies:[training, call_prep] |
| Owl (call QA) | playbooks/call-prep.md + nodes applies:[discovery, pitch, objection_handling] |
| Capitan Cubano (objections/closing) | nodes applies:[objection_handling, close] + scripts-and-frames.md |
| Taishan (experiments) | playbooks/ab-test-designs.md + test_loop_rule in graph |
| Stackman (offer architecture) | playbooks/offer-architecture.md + nodes applies:[offer_design] |
| El Papo (pipeline ops) | nodes applies:[reinforce_onboard, retention_ascension] |
| Kaffa (referrals) | nodes applies:[referral_partners] |

## Boundaries

- District structure and the 7 seat assignments await Bambú's sign-off (see mozi/SALES-DISTRICT.md). Knowledge files are committed and usable now.
- Verbatim vs interpretation separation is preserved in every citation (graph meta.evidence_rule).
