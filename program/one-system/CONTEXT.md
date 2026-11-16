# one-system — one command chain, one queue, every district working honestly

One job: Bambú talks to Instinct; Instinct runs the organization through StarNet; every piece of work is one
Paperclip issue; Heisenberg keeps it moving; every district has clear jobs, rules, agents and knowledge; independent
judges decide when work is done; the Command Center shows and steers all of it from a phone. 2D first; the 3D mirror
(tag `archive/feat/3d-starnet-upgrade`, `docs/3D_MIRROR_PROPOSAL.md`) comes last, with the owner.

This program **supersedes the GitHub-label queue in `program/city-247`** and **completes `docs/starfactory/`
(STARFACTORY-001)**. Their pure decision code is kept; only the queue source changes to Paperclip.

## Owner decisions (2026-11-16, Bambú)

| # | Decision |
|---|---|
| D1 | **Instinct is Chief of Staff.** It sits above StarNet and talks to Paperclip with the owner-delegate credential. |
| D2 | **Heisenberg is the foreman**: he plans, assigns any agent he is told to use, chases stalls and keeps agents proactive. He reports to Instinct. **If Instinct is down, Heisenberg is next man up** with full context and the same powers, until Instinct returns. |
| D3 | **Paperclip is the only queue.** One issue per job, with a district, an owner, done-means, a budget and a stop condition. No GitHub-label queue, no second ledger. |
| D4 | **ICM is global.** Every district and every agent passes the walk test: any model pointed at it can find its job, knowledge, rules and done-means from files alone. |
| D5 | **Models:** DeepSeek through OpenRouter, high reasoning, is the default for most work. The owner named it: `deepseek/deepseek-v4.1-flash-1017` (standard; the uncensored build comes later through Venice or Hermes). Tests and light work run on free models from the free pool (`05_models/CONTEXT.md`). Claude and Codex run on the owner's **$20 plans**, through their official command-line tools only, and only for big reviews and big design documents. Those plans have usage caps, so they are a scarce lane, not a 24/7 lane. |
| D6 | **Sleep when idle.** An agent with no assigned work sleeps until its heartbeat finds work or a schedule fires. No invented busywork. Each district has standing scheduled jobs with real outcomes. |
| D7 | **Budget:** $100 a month of API spend across all agents. Warn the owner at 80%; at 100% only revenue work continues. |
| D8 | **Every production release needs the owner's tap.** Agents may merge to preview after an independent judge passes it. |
| D9 | **Domain:** `thepaulieffect.com` (StarNet HQ and Command Center subdomains, behind sign-in). |
| D10 | **Keep all 12 districts.** Each agent is assigned to the right district with access to that district's knowledge and ICM files. |
| D11 | **No agent theatre.** A state shown anywhere must come from evidence (a Paperclip record, a run id, a receipt). The builder never reviews its own work. |

## Stages (numbering is the order)

| Stage | One job | Proof lives in |
|---|---|---|
| `01_roles` | Instinct / Heisenberg / judges / workers with explicit powers; succession when Instinct is silent | `01_roles/output/EVIDENCE.md` |
| `02_walk_test` | A global walk test every district and agent must pass, run in CI | `02_walk_test/output/EVIDENCE.md` |
| `03_districts` | 12 district charters: jobs, outcomes, rules, agents, knowledge, standing jobs; all agents assigned | `03_districts/output/EVIDENCE.md` |
| `04_one_queue` | city-247 foreman reads Paperclip, not GitHub labels; heartbeats and schedules; sleep when idle | `04_one_queue/output/EVIDENCE.md` |
| `05_models` | DeepSeek default, scarce subscription lane, per-agent and global budget enforcement | `05_models/output/EVIDENCE.md` |
| `06_pipelines` | Software factory end to end; revenue pipeline for the Found First offer; bot email/card/phone gates | `06_pipelines/output/EVIDENCE.md` |
| `07_command_center` | Phone control: talk to any agent, steer, approve, watch the live 2D city | `07_command_center/output/EVIDENCE.md` |
| `08_activation` | Deploy pack, live tests, handoff to Instinct on thepaulieffect.com | `08_activation/HANDOFF.md` |
| `09_3d` | 3D mirror from the archive tag, driven by the same evidence (with the owner, last) | `09_3d/output/EVIDENCE.md` |

## Status rule

Same as `program/starnet-v1` and `program/city-247`: a stage is done only with proof a stranger can check, and
`verified_by` is not `built_by`. Repository proof (tests against Paperclip's documented API) and live proof
(against the owner's servers) are recorded separately. Nothing here claims live proof until Instinct has run it.

## What the repository can prove vs what only the server can prove

- **Repository (built here):** decision code, adapters, schemas, walk test, CI tests, Command Center routes, deploy files.
- **Server (Instinct):** a running Paperclip with Postgres, real worker runs, real model calls and costs, phone access,
  the overnight soak. These follow the live test list in `08_activation/HANDOFF.md`.
