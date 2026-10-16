# city-247 activation evidence

built_by: claude-builder
verified_by: instinct
date: 2026-10-15T16:59:21Z
hostname: prod-city-1

verify.sh environment: REPO_DIR=/root/pauli-starnet GW=http://127.0.0.1:4001 SUPABASE_DB_CONTAINER=supabase-db (tokens from server env files, never printed)

```
== code
PASS  checkout contains be5f77b3cb1a1e6d0d9bc4de58dc220c49325a20 (HEAD 60cfe730)
PASS  test knowledge (knowledge.test: OK (68 assertions))
PASS  test district-foreman (district-foreman.test: OK (44 assertions))
PASS  test review-gate (review-gate.test: OK (17 assertions))
PASS  test first-lanes (first-lanes.test: OK (56 assertions))
== database
PASS  kb_documents=801 kb_chunks=13637 kb_insights=138
      by source: cause-specialist=40 email-copywriter=143 jake-trinder-20=20 jasper-smart-sites=50 manny-hormozi-315=315 metricsmule-video=150 monica-main=40 mozi-sales=43
PASS  server-held source jasper-smart-sites loaded (50 docs)
PASS  server-held source manny-hormozi-315 loaded (315 docs)
PASS  kb_search impact returns 5 rows
== gateway
PASS  knowledge search backend=supabase results=8
PASS  /v1/districts: 12 districts, fresh (age 142s)
      production    BLOCKED  Approve #68 "Brownfield inspection: allweather roofing and GOAT alliance repos", #67 "Smart-site factory: write the HVAC demo spec from the Jasper logic" (add the label "approved") to start.
      impact        BLOCKED  Approve #66 "Find the 10 easiest grants NW Kids qualifies for this quarter", #65 "Draft the NW Kids Google Business Profile copy", #64 "NW Kids Google readiness checklist (profile + Ad Grants)" (add the label "approved") to start.
      commerce      BLOCKED  #70 Please decide 0002, 0004 and 0009 (and who is seller of record) so the store can make its first brief.
== 24/7 tick
PASS  starnet-foreman.timer active (Thu 2026-10-15 17:00:28)
PASS  foreman WorkingDirectory=/root/pauli-starnet is a checkout
PASS  last tick result=success
== GitHub
PASS  Issues enabled on executiveusa/pauli-starnet
PASS  district:production has 2 issues
PASS  district:impact has 4 issues
PASS  district:commerce has 2 issues
SKIP  no approved items yet (OWNER: add the approved label to start work)
FAIL  REVIEW_GATE_REVIEWERS unset or executiveusa (OWNER: separate reviewer identity)
SKIP  review-gate on PR #62 head: failure: HOLD: no reviewer identity configured (set REVIEW_GATE_REVIEWERS) (+3 more) (clears when the reviewer approves)
== summary: 18 PASS, 1 FAIL, 2 SKIP
```
