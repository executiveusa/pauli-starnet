# 04_one_queue — Paperclip is the only queue

One job: every piece of work, owner-asked or scheduled, is one Paperclip mission with a district, a builder and an
independent judge; agents wake when Paperclip assigns them work and otherwise sleep.

## Inputs
- Reference: ../CONTEXT.md (D3, D6, D10), ../../../docs/starfactory/11_OPERATIONS_RUNBOOK.md
- Code: ../../../gateway/factory/districts.js, ../../../gateway/factory/heisenberg.js, ../../../gateway/factory/index.js

## Process
1. A mission names `district`, `builder` and `judge` (roster ids registered in `FACTORY_ROLES`); the builder can
   never be the judge, and the district must exist. Defaults stay `pi` and `qa`.
2. Every 5 minutes Heisenberg's sweep also runs standing jobs: each row of a district's "## Standing jobs" table
   becomes one mission per period for its named agent, judged by that agent's roster judge. Parked districts and
   unready agents schedule nothing; agents missing from Paperclip are reported, not faked.
3. `GET /v1/factory/districts` is the district board from Paperclip only. `GET /v1/districts` on the city gateway
   serves it when `FACTORY_BASE_URL` and `FACTORY_OWNER_TOKEN` are set; the GitHub-label board is a labeled fallback.
4. Sleep when idle: Paperclip wakes an agent on assignment or heartbeat; no assignment, no run.

## Outputs
- output/EVIDENCE.md

## Human check
Bambú opens the district board and sees RUNNING only where a mission exists.
