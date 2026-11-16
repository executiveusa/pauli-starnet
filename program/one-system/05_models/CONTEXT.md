# 05_models — the right model for each job, inside the budget

One job: every run uses its agent's model lane, scarce subscription runs are capped, and the $100 monthly budget holds.

## Inputs
- Reference: ../CONTEXT.md (D5, D7), ../../../registry/models.json (the one home for model choices)
- Code: ../../../gateway/factory/model-routing.js, ../../../gateway/factory/worker-bridge.js

## Process
1. Each roster agent names a `model_lane`: `deepseek-default`, `subscription-review` or `instinct-own`.
2. Before a run the bridge routes it: lane model and reasoning level; subscription lane over its daily cap falls back
   to DeepSeek; at 100% of the monthly budget only revenue-district work runs.
3. A lane whose model id is still `VERIFY_*` is not guessed: the run keeps its executor's configured model and the
   receipt records why.

## Outputs
- output/EVIDENCE.md

## Human check
Whoever verifies the live OpenRouter catalog writes the exact DeepSeek model id into `registry/models.json`.
