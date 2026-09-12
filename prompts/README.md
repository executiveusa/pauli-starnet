# prompts/ — fleet prompt system

One shared constitution plus thin per-agent overlays. At deploy time an agent's
system prompt is assembled as:

```
constitution.md  +  manifest.json[agent] overlays
```

The constitution is vendor-neutral and identical for every agent. An overlay
carries only what is true for that agent: name, job, tools, and its don'ts.
Edit the constitution once and the whole fleet inherits the change; edit an
overlay and only that agent changes.

## Files

| File | Applies to | Contents |
|---|---|---|
| `constitution.md` | every agent | memory calibration, verify-before-answer, tool contracts, the four gates, evidence standard |
| `overlays/hermes.md` | Hermes (policy / routing) | the routing ladder: ordered decision checklist for model, tool, and skill selection |
| `overlays/heisenberg.md` | Heisenberg (foreman) | stateless mission packaging: state in with each mission, state out with each receipt |
| `overlays/bars.md` | BARS (front-door voice agent) | full overlay: personality, Bond voice behavior, conversation memory, grounding, tool contracts |
| `overlays/worker.md` | every task-scoped worker | least-scope execution loop and receipt contract |
| `overlays/{merci,beacon,herald,ledger,conduit}.md` | named city agents | thin role, tool, and don't cards |
| `manifest.json` | prompt assembly | explicit constitution + overlay mapping |

City agents (MERCI, BEACON, HERALD, LEDGER, CONDUIT) and workers run the
constitution plus a thin card: name, job, tools, don'ts. Cards belong in
`overlays/` as they are written.

Rules for editing this folder:

1. Techniques are paraphrased in our own words. Never paste text from another
   vendor's prompt, leaked or otherwise.
2. The constitution names behavior, not models. Model names belong in config,
   not in the shared base.
3. An overlay may narrow a constitution rule, never loosen a gate.


Preview the exact assembled prompt without changing a running agent:

```sh
node scripts/assemble-agent-prompt.mjs heisenberg
```

This repository is the reviewable source package. Opening or merging a prompt PR does not hot-reload a running worker. Promote an accepted SHA through the normal builder -> reviewer -> judge release gate, then verify the deployed prompt hash before calling it active.
