# Operations district — keep the lights on

One job: keep servers, agents and loops healthy at night and by day: monitoring, hygiene, recovery and agent reliability.
Lane: `registry/district-lanes.json` (`operations`). Queue: Paperclip issues in district `operations`.

## Agents

Roster: `districts/operations/citizens.yaml` (one home per agent; role, status, done-means and judge for each). 

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Health check | each service reports a fresh heartbeat or is marked No heartbeat | qa-judge |
| Server hygiene | disk and memory under limits; cleanup logged before and after | qa-judge |
| Agent reliability | failed runs triaged with cause and fix proposal | qa-judge |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Never delete data, volumes, backups or secrets; follow the cleanup rules in the deploy prompt.

## Knowledge

- `loops/README.md` (the loops)
- `docs/starfactory/11_OPERATIONS_RUNBOOK.md`
- `districts/pauli/board/seats/indydevdan.md`

## Standing jobs

Each row becomes one Paperclip mission per period for its agent (rows for Instinct or Heisenberg, and anything every 15 minutes or less, run in the gateway instead). With nothing to do, agents sleep.

| When | Job | Agent | Outcome |
|---|---|---|---|
| every 15 min | Heartbeat check | green-guardian | stale services listed |
| nightly 02:00 | Hygiene pass | janitor | cleanup log |
| nightly 03:00 | Failed-run triage | indydevdan | triage notes on issues |

## Human check

Bambú reads only incidents that need a decision.
