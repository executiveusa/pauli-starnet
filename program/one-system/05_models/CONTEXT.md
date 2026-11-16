# 05_models — the right model for each job, inside the budget

One job: every run uses its agent's model lane, light and test work runs free, scarce subscription runs are capped,
and the $100 monthly budget holds.

## Inputs
- Reference: ../CONTEXT.md (D5, D7), ../../../registry/models.json (the one home for model choices)
- Code: ../../../gateway/factory/model-routing.js, ../../../gateway/factory/worker-bridge.js
- Check: ../../../scripts/models/free-pool.js (free list from github.com/open-free-llm-api/awesome-freellm-apis)

## Process
1. Each roster agent names a `model_lane` in its citizens.yaml:
   | Lane | Model | For |
   |---|---|---|
   | `deepseek-default` | `deepseek/deepseek-v4.1-flash-1017` on OpenRouter ($0.15 in / $0.60 out per million tokens) | most work |
   | `uncensored` | DeepSeek 1017 uncensored on Venice or through Hermes; not wired yet, so it falls back to the default | work the standard model refuses |
   | `subscription-review` | Claude on the owner's $20 plan, 6 runs a day, then the default | big reviews and design documents |
   | `free-pool` | the first free model whose provider has a key (list in `free_pool`) | tests and light jobs |
   | `instinct-own` | Instinct's own platform | Instinct only |
2. A mission picks free models by saying how heavy it is: `"weight": "light"` or `"weight": "test"` when it is
   submitted (`POST /v1/factory/missions` or a standing job). `"private": true` keeps it off free models.
3. The bridge routes every run, in this order:
   - free-pool agent, or light or test work: the free pool, if any free provider has a key
   - budget at 80% (WARN): non-revenue work moves to the free pool
   - budget at 100% (STOP): non-revenue work runs only on the free pool; if no free key, it stops
   - otherwise the agent's lane (subscription over its cap and unwired lanes use their fallback)
   Revenue work, private missions and the `financial` and `pauli` districts never run on free models.
4. Fallbacks, so a run doesn't die when a model is down, rate-limited or refuses:
   - OpenRouter lanes send OpenRouter's own `models` list (openrouter.ai/docs/guides/routing/model-fallbacks):
     OpenRouter tries each model in order within one request and bills the one that answered. The default lane falls
     back from DeepSeek 1017 to `deepseek/deepseek-v4.1-flash`, then `deepseek/deepseek-v4-flash`.
   - Free work falls back to other free OpenRouter models, then to the other free providers (any without a key is
     skipped). Paid work never falls back to a free model, and free work never falls back to a paid one.
   - Edit the lists in `registry/models.json` (`fallback_models`). `node scripts/models/free-pool.js` checks every id.
5. Every receipt records the lane and why (`route_note`), so the board shows which model did what.

## Turning the free pool on
1. Get a free key from one or more providers (no card needed): Groq (console.groq.com/keys), Google AI Studio
   (aistudio.google.com/app/apikey), Mistral (console.mistral.ai/api-keys). OpenRouter's free models use the
   OpenRouter key StarNet already has.
2. Put the key in the sidecar's environment under its usual name (`GROQ_API_KEY`, `GEMINI_API_KEY`,
   `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`). If the factory gateway runs in a separate process, also set
   `FREE_POOL_PROVIDERS=openrouter,groq` (names only) in the factory's environment.
3. Run `node scripts/models/free-pool.js`. Every row should say OK. A row that says CHECK means the provider is
   down or the model was removed: pick a replacement from the list it prints and edit `free_pool.candidates`.
   Re-run it monthly; free lists change often.

## Wiring the uncensored lane later
Add Venice to the sidecar as a custom OpenAI-compatible provider (base URL and key from the Venice account), or route
through Hermes, then write the exact model id into `lanes.uncensored.model`. Until then that lane uses the default.

## Outputs
- output/EVIDENCE.md

## Human check
The owner confirms model ids against the live catalogs. Free models are never used for client personal data.
