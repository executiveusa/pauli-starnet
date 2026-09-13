> IMPORTED CANON - source: executiveusa/pauli-jarvis-demo (PRIVATE, authenticated read 2026-09-13, repo updated 2026-09-13T08:32:18Z) | path: README.md | imported 2026-09-13 verbatim below this header; the header is the only addition.

# Cosmos-II — Brain Keeper Agent

> "I am COSMOS-II. I hold the keys to the Amentis Library."

This repo now holds two unrelated things:
- **`agent.js`** (below) — the small Pauli Effect demo agent, Cosmos-II.
- **[`jarvis-web/`](./jarvis-web)** — a separate, real "Jarvis" personal assistant
  (chat + Gmail/Calendar + Telegram + invoicing), rebuilt as a Vercel-deployable
  Next.js app. See `jarvis-web/README.md` for setup and deploy steps.

Cosmos-II (formerly Jarvis) is the **second brain manager** of The Pauli Effect. It manages the knowledge graph — organizing documents, deduplicating, connecting ideas. Never forgets.

## Renamed from Jarvis

This agent was originally named Jarvis. It has been renamed to Cosmos-II to match the Pi agent (Cosmos), reflecting their complementary roles:
- **Cosmos (Pi)** — the librarian who knows where every book lives
- **Cosmos-II** — the engineer who maintains the library structure itself

## Part of the X-Men Agent Architecture

| Agent | Role |
|-------|------|
| Hermes | Orchestrator |
| Cosmos (Pi) | Engineering Lead |
| TARS | Builder |
| **Cosmos-II** | **Brain Keeper** |

## Run Cosmos-II

```bash
git clone https://github.com/executiveusa/pauli-jarvis-demo.git
cd pauli-jarvis-demo

export OPENAI_API_KEY=your-key-here
export API_BASE=https://openrouter.ai/api/v1
export MODEL=meta-llama/llama-3.2-3b-instruct:free

node agent.js --name "Cosmos-II" --role "Brain Keeper" --port 4719
```

Open http://localhost:4719 to chat with Cosmos-II.

## What it manages

The Amentis Library — 7 shelves:
- 100-IDENTITY
- 200-STRATEGY-AND-DOCTRINE
- 300-AGENTS-AND-PEOPLE
- 400-CLIENTS-AND-PROJECTS
- 500-SKILLS-AND-PATTERNS
- 600-OPERATIONS
- 700-MEMORY-AND-REFLECTION

## License

MIT. Built by The Pauli Effect.

