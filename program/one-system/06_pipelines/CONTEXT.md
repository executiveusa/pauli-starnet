# 06_pipelines — software and revenue work end to end

One job: run multi-stage work (a software product, a Found First client) as a chain of missions, each with its own
builder and an independent judge, pausing at owner gates.

## Inputs
- Reference: ../../../registry/pipelines.json, ../../../registry/tools-policy.json
- Code: ../../../gateway/factory/pipelines.js, ../../../gateway/factory/planner.js (spec stage)

## Process
1. `POST /v1/factory/pipelines` `{pipeline, run, subject}` starts a run; each stage becomes one mission
   `<district>.<pipeline>.<run>.<NN>-<stage>`; the sweep starts the next stage when the previous is done.
2. Software stages (`pipeline: software`) run spec → build → independent review → repair → owner acceptance.
3. A stage with `gate: owner` waits for `POST /v1/factory/pipelines/<pipeline>/<run>/advance`.
4. Publishing, sending, spending and deploying are never unattended: those missions park for owner authorization.

## Outputs
- output/EVIDENCE.md

## Human check
Bambú starts one real Found First run for a warm prospect and advances it after the sale.
