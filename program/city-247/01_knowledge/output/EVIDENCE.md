---
stage: 01_knowledge
status: done
built_by: claude-session-01UT634v
verified_by: ""
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf (this commit)
proof:
  - node test/knowledge.test.js against a real Postgres 16 (raw below)
  - load of every repo source into a fresh database + three kb_search queries (raw below)
blocker: ""
---

Run on 2026-10-15 in the builder's container (Postgres 16.13, local socket). Not the production server.

## Test

```
$ KB_TEST_PGHOST=<local socket> node test/knowledge.test.js
knowledge.test: OK (72 assertions)
```

## Load + search

```
 sources | routes | documents | chunks | insights 
---------+--------+-----------+--------+----------
      12 |     19 |       436 |   4544 |       58
(1 row)

    source_id     | external_id |                     title                     | rank  
------------------+-------------+-----------------------------------------------+-------
 cause-specialist | NVJyUFfRQtM | Before a Funder Gives You Money, They Check T | 0.146
 cause-specialist | hdk5pvzKDHI | The Tells That Funders Use to Reject AI Fundr | 0.146
 cause-specialist | xl1Ccs9HGaA | Small Nonprofits Keep Making These 4 Fundrais | 0.099
(3 rows)

    source_id    | external_id |                     title                     | rank  
-----------------+-------------+-----------------------------------------------+-------
 mozi-sales      | OQf2Ba-Lp_4 | Building a $2,500,000 Business for a Stranger | 0.537
 mozi-sales      | uaLNfijnp-8 | This Video Should Be Required Viewing for Bus | 0.286
 jake-trinder-20 | 9-UeFXA-aZg | how I made $473,783 last month at 21          | 0.221
(3 rows)

 district | insights 
----------+----------
 creative |       15
 revenue  |       43
(2 rows)
```

## Not proven here
- The self-hosted Supabase on the server: the migration and load have not run there (deploy handoff step).
- `jasper-smart-sites` (NEW box) and `manny-hormozi-315` (old box): on the servers only; load with `--dir` there.
- `stefan-3d` and `closer-sales-call-stages` live in other repos; `androoagi-study` is unlocated.
