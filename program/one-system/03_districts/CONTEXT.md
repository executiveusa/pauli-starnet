# 03_districts — every district has a charter, every agent a home

One job: give each of the 12 districts clear jobs, outcomes, rules, agents, knowledge and standing jobs.

## Inputs
- Reference: ../../../registry/districts.json (the 12 districts), ../../../registry/district-lanes.json (aliases)
- Reference: ../../../districts/pauli/board/seats/ (council seats)

## Process
1. Each district contract lives in `districts/<id>/CONTEXT.md`; existing contracts were extended, not replaced.
2. Rosters live in `districts/<id>/citizens.yaml`; Middleton (revenue) and JEV (intelligence) keep their own
   rosters and are included, so each agent has one home.
3. The 13 council members are assigned where they work: King Doe, Michele Torti, Phlash, Boring Marketer and
   Hormozi (parked) in revenue; Kallaway in creative; Seth Godin and Cody Schneider in intelligence; Jake Van Clief
   and Skeptic in command; Matt Pocock in production; IndyDevDan in operations; Matt Clark in commerce.

## Outputs
- output/EVIDENCE.md

## Human check
Bambú reads the revenue and command charters and confirms the jobs and judges.
