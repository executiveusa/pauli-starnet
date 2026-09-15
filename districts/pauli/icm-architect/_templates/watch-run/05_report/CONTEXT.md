# 05_report

One job: render critical, daily and weekly proposal reports.

## Inputs
- Working: ../04_propose/output/proposals.json
- Reference: ../../../_meta/authority.md
- Reference: ../../../_shared/evidence-rules.md

## Process
1. Read only the named inputs and references.
2. Run the deterministic stage implementation.
3. Write brief.json to output/.

## Outputs
- output/brief.json

## Human check
Confirm the reports contain no mutation or send instruction and silence daily output when nothing material changed.
