# 03_shadow - observe one real run

One job: annotate the decisions and gates in a completed workflow run.

## Inputs
- Working: approved archived run selected by trainer
- Reference: `../../../02_client-channel/CONTEXT.md` as the default shadow contract; trainer may name one alternate workflow CONTEXT path

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- shadow-log.md → output/
- gate.md → output/

## Human check
Trainer verifies the learner distinguished routing, factory, product and gate decisions. Edit the artifact in place; the next stage reads the approved version.
