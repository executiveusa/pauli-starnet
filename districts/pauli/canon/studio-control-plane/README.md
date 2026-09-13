> IMPORTED CANON - source: executiveusa/pauli-studio-control-plane@dba3a6acdfeb124fb9b2737cdfa091f5fafcd2be (master) | path: README.md | imported 2026-09-13 verbatim below this header; the header is the only addition.

# Pauli Studio Control Plane

**The single source of truth for The Pauli Effect agent fleet.**

This repo contains the complete setup for the 4 named agents (Pi, Hermes, TARS, JARVIS), the fleet adapter, the observation API, the brand design system, and the Paperclip agent registry reference.

## Structure

```
pauli-studio-control-plane/
├── pauli-effect/              ← The live agent code (synced from VPS /opt/pauli-effect/)
│   ├── agents/
│   │   ├── cosmos-pi/         ← Pi (Engineering Lead) — Node.js server
│   │   ├── cosmos-brain/      ← JARVIS (Brain Keeper) — Python server + 3D viewer
│   │   ├── hermes/            ← Hermes (Orchestrator) — Node.js + Telegram
│   │   ├── tars/              ← TARS (Builder) — Python + hands + voice
│   │   ├── skills-api/        ← Skills + Persona API
│   │   └── personas/          ← Agent persona catalog
│   ├── library/               ← Amentis Library (skills-icm, shelves)
│   └── guardrails/            ← HARD_BLOCKS.md (non-negotiable policies)
├── fleet/
│   └── adapter.js             ← Fleet adapter (OpenAI-compatible router → all 4 agents)
├── observe/
│   └── server.js              ← Observation API (polls agents, SSE stream, bridge endpoint)
├── design-system/
│   ├── taste-skill/           ← Pauli Taste Skill (stops AI slop UI)
│   ├── uncodixfy/             ← Uncodixfy (clean human-designed aesthetics)
│   └── brand-kit/             ← Brand assets, colors, typography
├── PAPERCLIP.md               ← How Paperclip AI integrates as the agent registry
└── ARCHITECTURE_PLAN.md       ← The full studio plan
```

## The 4 Agents

| Agent | Role | Source | Port |
|---|---|---|---|
| **Pi** (Cosmos) | Engineering Lead — routing, context brokering | `pauli-effect/agents/cosmos-pi/server.js` | 4717 |
| **Hermes** | Orchestrator — dispatch, Telegram, fan-out | `pauli-effect/agents/hermes/hermes_orchestrator.js` | 4800 |
| **TARS** | Builder — voice, hands, cloud coding | `pauli-effect/agents/tars/server.py` | 4321 |
| **JARVIS** (Cosmos-II) | Brain Keeper — memory, 3D viewer, recall | `pauli-effect/agents/cosmos-brain/server.py` | 4719 |

## Design System Connection

Agents read brand rules from `design-system/` when generating UI:
- **taste-skill** — the taste rubric (hierarchy, restraint, finish, no generic AI patterns)
- **uncodixfy** — clean aesthetic rules (Linear/Raycast/Stripe/GitHub-inspired)
- **brand-kit** — colors, typography, voice, logo assets

TARS is the primary consumer (he builds UI), but any agent can reference these when their work touches visual output.

## Live Deployment

- **VPS:** `31.220.58.212` (Hostinger KVM 2) — all agents run here via systemd
- **LibreChat:** `https://api.thepaulieffect.com` (the chat dashboard)
- **Observation API:** `https://api.thepaulieeffect.com/observe/*` (Tailscale-gated)
- **Mobile dashboard:** `https://pauli-deck.vercel.app`
- **Fleet adapter:** bind-mounted from `fleet/adapter.js` → `/opt/librechat/adapter.js` on VPS

## Model Configuration

All agents currently use **Groq llama-3.3-70b-versatile** (free, fast).
Switchable via Telegram `/model <agent> <model>` or by editing config.

## Syncing Live Changes

When you edit agent code on the VPS, sync it back here:
```bash
# From local machine
ssh root@31.220.58.212 'cd /opt && tar czf /tmp/snap.tar.gz pauli-effect/agents/ pauli-effect/library/'
scp root@31.220.58.212:/tmp/snap.tar.gz .
```
