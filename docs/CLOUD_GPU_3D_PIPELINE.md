# Cloud GPU pipeline — Unreal Engine + Blender, driven by GPT-6 Astra through HyperAgent

Date: 2026-09-10. Nothing in this document is provisioned. GPU spend, HyperAgent
credit use, and model access are approval-gated; this is the design and cost map.

## Verified model status (2026-09-10)

- **GPT-6 Astra** is a real, official OpenAI model (openai.com/index/gpt-6-astra,
  developers.openai.com/api/docs/models/gpt-6-astra): ~1.05M context, image input and
  image generation, code interpreter, and a first-party tutorial for building
  browser-native 3D games with TypeScript/Vite/Three.js moving to WebGPU
  (developers.openai.com/blog/how-to-build-games-with-astra). "ChatGPT 6 Astra" is a
  misnomer — ChatGPT is one access surface; the model id is GPT-6 Astra.
- **HyperAgent's public supported-model table does not list GPT-6 Astra** (it lists the
  GPT 5.6 family and Fable 5; hyperagent.com/docs/concepts/agents/models). HyperAgent
  says the in-workspace picker is the source of truth, so Astra access through
  HyperAgent is **unverified until checked inside Jeremy's workspace**. That check is
  a two-minute look at the picker, not a purchase.
- Neither Astra nor any LLM is a 3D engine. Astra writes and drives the code/scene
  logic; Unreal and Blender do the heavy rendering below.

## Architecture

```text
JEREMY (WhatsApp — approval boundary)
  ↓
INSTINCT (front door, holds approvals + budgets)
  ↓
HERMES (plans, decomposes, governs)  ←→  HYPERAGENT + GPT-6 ASTRA (scene/code generation,
  ↓                                       tool use, visual verification of renders)
STARNET CITY — new "Studio District" mission lane
  ↓ dispatch via connector lane (execution ladder: connector → MCP → shell)
CLOUD GPU WORKERS (ephemeral, per-mission)
  ├─ Unreal Engine worker: headless UE build/cook + Pixel Streaming for interactive review
  └─ Blender worker: blender -b (headless) for model/scene/render jobs
  ↓
EVIDENCE + RECEIPTS back to the city (renders, logs, cost ledger)
```

Key properties:

- **Ephemeral workers, not another always-on server.** A mission spins up a GPU pod,
  runs the job, streams back evidence, and tears down. Idle GPU time is the main cost
  leak; pods that die on mission end can't leak.
- **The city stays the control plane.** Astra/HyperAgent output becomes missions with
  receipts; the same approval gates that cover spend and publishing cover GPU launches.
- **Output feeds the scroll world**: Unreal/Blender renders become district scenes,
  game builds, or scroll-chain media in pauli-scroll-world's production stage.

## Compute options (current public pricing)

RunPod (official pricing, verified Sep 2026 via markaicode.com/pricing/runpod-pricing):
- RTX 4090 24GB pod: **$0.74/hr** — Blender cycles work, UE editor-headless jobs, model
  renders. Billed per second while running.
- A100 80GB pod: $1.39/hr; serverless A100 $2.72/active-hr (scales to zero — good for
  bursty render queues); H100 $2.89/hr pod.
- Storage: network volumes $0.07/GB/mo; **idle volume disks bill $0.20/GB/mo — delete
  or snapshot after teardown** (documented leak point).
- Break-even: below ~370 active GPU-hr/month serverless beats dedicated pods.

Unreal Pixel Streaming (interactive review from his phone):
- Azure reference architecture exists (learn.microsoft.com/gaming/azure/
  reference-architectures/unreal-pixel-streaming-deploying); AWS path documented
  community-side (thegabmeister.com/p/unreal-pixel-stream-aws/). GPU instance +
  signaling server; cost is one GPU VM per concurrent viewer session class, so this is
  for review sessions, not 24/7 uptime.

Blender farms (alternative to owning GPU time for pure rendering):
- GarageFarm, RebusFarm, Blendergrid and peers sell per-render pricing with cost
  calculators (render.st comparison, 2026). For occasional final-frame renders a farm
  is simpler than pods; for iterative agent-driven work, per-second pods give Astra a
  live feedback loop farms can't.

## Suggested phases

1. **Phase 0 (no spend):** verify GPT-6 Astra in the HyperAgent workspace picker;
   stand up the Studio District mission lane and receipts with jobs that run on
   existing hardware (Blender headless on the VPS is CPU-only — fine for smoke tests).
2. **Phase 1 (~$20–50/mo):** RunPod RTX 4090 pods on demand for Blender scenes Astra
   authors; Pixel Streaming only for scheduled review sessions. Hard budget cap in the
   paid-ledger; teardown verified by receipt after every mission.
3. **Phase 2 (scale only with proven revenue):** Unreal build workers, persistent
   Pixel Streaming for client-facing experiences, serverless render queue.

## Controls (non-negotiable)

- Every pod launch is a budgeted, approval-gated mission with a max-runtime kill.
- Every mission ends with teardown proof + cost receipt in the city ledger.
- No GPU endpoint is public without auth; Pixel Streaming sessions are owner-invited.
- Astra/HyperAgent never gets raw cloud credentials — workers are launched by the
  city's connector lane with scoped keys, per the execution ladder.
