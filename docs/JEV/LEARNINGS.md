# JEV Learnings

## Sources
- https://www.youtube.com/watch?v=hNolGeEBMvw - Serop, "How to Predict Your AI Costs Before You Build," 2026-09-18.
- https://www.youtube.com/watch?v=4mTLpuQpB80 - Greg Isenberg with Ryan Vogel, "Jev is HERE. How to use it," 2026-09-18.
- https://www.youtube.com/watch?v=EzQAgnjTq2k - Greg Isenberg with Allie K. Miller, "My top secrets to running an AI Agent Workforce," 2026-08-12.

## FACT - JEV is a structured classifier, not a chat model
**Source:** Greg Isenberg / Ryan Vogel, 2026-09-18.  
**Evidence:** Input + output schema returns probabilities for each choice in about 200ms. Demo classified 1,700 emails for category, priority, spam, and reply likelihood at $0.18 total.  
**StarNet seam:** model router; job intake; typed result contracts; receipt/audit stream.  
**Use:** Preflight high-volume hooks, prompts, grid slices, and queue items before expensive generation or frontier judgment.

## FACT - JEV belongs at the front of expensive queues
**Source:** Greg Isenberg / Ryan Vogel, 2026-09-18.  
**Evidence:** Video describes JEV as an AI traffic cop for lead scoring, support routing, video clipping, and browser choices. Seventeen video moments were scored in about three seconds; browser-use flight choice took 7.1 seconds.  
**StarNet seam:** queue router; browser-use decision support; hook library ingestion; asset gauntlet prefilter.  
**Use:** High-confidence safe/valuable work routes to cheap production; ambiguous/high-value work routes to Astra/human; low-value/duplicate/unsafe work stops.

## FACT - JEV should not be final authority on high-risk decisions
**Source:** Greg Isenberg / Ryan Vogel, 2026-09-18.  
**Evidence:** The Bitcoin buy/hold/sell test performed poorly; frontier models did better when external knowledge mattered.  
**StarNet seam:** policy gates; spend gate; publishing/representation gates; escalation logic.  
**Use:** JEV confidence never authorizes money, publishing, representation, or safety-sensitive action.

## FACT - Forecast the whole system, not one model call
**Source:** Serop, 2026-09-18.  
**Evidence:** Tutorial covers separate input/output costs, hidden agent-loop calls, task frequency, model selection, retries, batching, caching, and buffer.  
**StarNet seam:** cost router; run receipt; budget guard; model selector.  
**Use:** Every job gets a defined unit, volume, stage map, best/expected/worst cost, retries, hard stop, and actual-vs-predicted receipt.

## IDEA - JEV schemas for the Crypto Cuties factory
**Derived from:** JEV classifier pattern, 2026-09-18.  
**StarNet seam:** ICM hook library; video watcher; canonical-character validator; cost router.  
**Draft fields:** `hook_score`, `identity_risk`, `hands_risk`, `product_risk`, `location_truth`, `unsupported_claim_risk`, `duplicate_score`, `needs_human`, probabilities, source ID, schema version, routed lane, predicted cost avoided, final outcome.  
**Status:** Learn-and-document only. JEV pilot remains paused. Shadow-score before any automatic routing.

## FACT - "Do smart things" works only on top of deep context
**Source:** Greg Isenberg / Allie K. Miller, 2026-08-12.  
**Evidence:** Their 34-agent workforce reads goals, meetings, email, calendar, Notion, Stripe, Supabase, GitHub, and an 80+ entry dictated diary. The human operates several rungs above execution and receives escalations.  
**StarNet seam:** context assembly; memory/canon; proactive task selection; chief-of-staff orchestration.  
**Use:** A three-word prompt is not magic. It is a trigger over full business context, goals, tools, permissions, cost map, quality bar, and prior failures.

## FACT - Hold risk tier fixed while expanding scope
**Source:** Greg Isenberg / Allie K. Miller, 2026-08-12.  
**Evidence:** They describe broad proactive scope, watchdogs, escalation, and agents planning for failure, not unbounded authority.  
**StarNet seam:** constitution; authority gates; watchdog agents; escalation.  
**Use:** Agents find and complete safe, reversible, useful work without step-by-step direction. Spend, publishing, representation, secrets, and owner decisions still escalate.

## FACT - Make the company queryable
**Source:** Greg Isenberg / Allie K. Miller, 2026-08-12.  
**Evidence:** Daily dictated diary captures context missing from meetings, email, and Slack; voice is described as about four times faster than typing.  
**StarNet seam:** memory ingestion; voice diary; searchable canon; daily close.  
**Use:** Add a daily context-capture path so agents can recover preference shifts, constraints, and intent that live outside project tools.

## FACT - Watchdogs are first-class roles
**Source:** Greg Isenberg / Allie K. Miller, 2026-08-12.  
**Evidence:** Examples include duplicate work, calendar conflicts, meeting disagreement, friction, and missing access.  
**StarNet seam:** FTC audit; production watcher; calendar monitor; access health; duplicate detector.  
**Use:** For media: watch duplicate renders, identity drift, cost drift, stale source images, missing disclosure, blocked dependencies, and gauntlet regression.

## FACT - Build the factory before the product
**Source:** Greg Isenberg / Allie K. Miller, 2026-08-12.  
**Evidence:** Reusable login, payment, social, and newsletter primitives made later products faster.  
**StarNet seam:** harness backend; reusable skills; creator factory; receipt and approval primitives.  
**Use:** Crypto Cuties factory primitives are canonical identity, wardrobe/location matrix, hook library, prompt templates, gauntlet, cost router, receipt schema, disclosure overlay, and failure routing.

## What "go do smart things" unlocks
We now understand it as a bounded operating command:
1. Read goals, current work, cost map, quality bar, canon, prior failures, and tools.
2. Find the next useful work the user should not have to spell out: remove a bottleneck, prevent a failure, enrich an active asset, or surface a decision.
3. Complete safe/reversible preparation without waiting for micro-instructions.
4. Plan for failure: retries, fallback lanes, stop conditions, and receipts are part of the task.
5. Escalate only the load-bearing boundary: new spend, publishing, representation, secrets, or unresolved owner choice.
6. Return proof: artifact, source, score, cost, and changed state.

This expands breadth, not authority. Existing constitutional gates remain unchanged.
