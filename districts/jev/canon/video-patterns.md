# JEV District Canon - patterns folded from the 2026-09-19 video deep dive

Source: 8-video deep dive (owner-attached, 2026-09-19); the Jev videos are 2, 4, and 8.

## Video 2 - Jev Ultrafast browser agent (AICodeKing)
- Structured DOM snapshot + indexed action space: model picks operation + element index. One AI call per action instead of three.
- Measured: Google Flights 7.1s, $0.0039/task, protocol calls 1,092 -> 101, ~25% faster median.
- Prompt-injection resistance is load-bearing for us: our agents drive logged-in sessions (hPanel, Postiz, Coolify). A driver that survives injection testing is a security upgrade.
- MVP limits: no shadow DOM, frames, canvas, file uploads, nested scroll. The router must know which driver owns which page class.
- District pattern: browser rung of the execution ladder gets a JEV shadow driver - recommends the DOM action, current driver executes, receipts compare. Same reversible pattern as worker-routing shadow.

## Video 4 - Astra allowance economy (RoboNuggets)
- One allowance, 5-hour + weekly windows; Astra-class burns far faster.
- Task shaping beats everything: small scoped missions, no mega-prompts.
- District pattern: allowance-governor skill (LIVE) tracks window state, routes heavy missions to Astra only when justified, default = cheap floor. Heisenberg enforces a token ceiling per unit.

## Video 8 - Jev as general typed-decision layer (David Ondrej)
- TypeSafe System One: unstructured state + typed questions in, typed answers + confidence out. No prose, no code, no explanation.
- Shipped community cases: classification/routing in hot paths, computer-use ~$0.0002/step, trading-pair decisions.
- Honest caveats: Jev cannot generate text; read TypeSafe speed caveats before benchmarking.
- District pattern: JEV graduates from one shadow decision to a decision class - mission classification, worker selection, escalation detection. Every place a big model answers what is really a typed question.
- Boundary, restated: JEV decides, it does not write. Never push JEV into generation.

## Standing confirmations
- Groq-default cost posture validated twice (videos 2, 8): near-zero-cost decisions at the highest-frequency layer.
- The reversible shadow pattern (recommend, compare, receipt) is how every new JEV lane enters the city.
