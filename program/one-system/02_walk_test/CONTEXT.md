# 02_walk_test — any model can walk the city from files alone

One job: prove that every district and every agent can be found, understood and run from files, whichever model reads them.

## Inputs
- Reference: ../../../START_HERE.md (rules 1 to 3), ../../../.agents/skills/icm-architect/SKILL.md ("The walk test")
- Code: ../../../scripts/icm/walk.js

## Process
1. `node scripts/icm/walk.js` walks START_HERE.md, then each district in `registry/districts.json`.
2. Each district needs `districts/<id>/CONTEXT.md` with a "One job:" line and six sections (Agents, Jobs and
   done-means, Rules, Knowledge, Standing jobs, Human check), and a `citizens.yaml` roster (may include sub-team
   rosters from alias folders).
3. Each agent needs id, role, status, done_means and an independent `judged_by` (another agent or the owner),
   exactly one home district, and every path it names must exist.
4. START_HERE.md plus a district contract must fit in 8,000 tokens; START_HERE.md stays under 60 lines.

## Outputs
- output/EVIDENCE.md

## Human check
Pick any district, open only START_HERE.md and its CONTEXT.md, and say what the district does and who judges its work.
