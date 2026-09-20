# JEV District

One-sentence law: **JEV decides, it does not write.** Hermes plans in prose, JEV routes in types, workers execute.

## What this district owns
- The JEV socket: `netlify/functions/jev-decision.mts` (TypeSafe typed-question seam) and `sidecar/jev-client.js`.
- The shadow decision plane: `sidecar/jev-shadow-openrouter.js`, live on the VPS (127.0.0.1:8794, systemd `pauli-jev-shadow.service`), recommend-only, kill switches armed (`STARNET_JEV_DISABLED=1`, missing `x-starnet-jev-enabled` header -> 409). Receipts: `registry/jev-shadow-ledger.jsonl`.
- The allowance-governor skill: `sidecar/skills/library/allowance-governor.md` (token-window economy for metered agents).
- The docs: `docs/JEV/` (COST-MODEL, LEARNINGS).
- The researcher bench: `districts/jev/research/` - standing job is cooking JEV applications (see research/seeds.md).

## Citizens
See citizens.yaml. Registered agents that live here:
- `jev-socket` (typed-question seam)
- `jev-shadow` (free-floor shadow decision plane, LIVE)
- `allowance-governor` (window-economy skill, LIVE)
- `jev-researcher` (daily application research, LIVE on free floor)

## Boundaries
- Recommend-only until the owner says "wire it". Current routes stay in charge.
- Money gate: researchers propose; nothing spends or ships without the owner.
- No prose generation: JEV never writes copy. Generation is Astra/Groq work.
- Free floor only: every live call runs on verified free-tier models.
