# 01_orient - learn the map

One job: show the learner how to route work and derive status from files.

## Inputs
- Working: `input/learner.md`
- Reference: `../../../../CLAUDE.md`, `../../../../GRAPH.md`, `../../../../_meta/schema.md`

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- orientation-check.md → output/
- gate.md → output/

## Human check
Learner routes four example requests correctly without crawling the workspace. Edit the artifact in place; the next stage reads the approved version.
