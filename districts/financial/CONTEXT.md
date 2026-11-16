# Financial district — money in, money out

One job: keep honest books: costs, budgets, revenue records and the monthly close, with payment rails disabled until the owner enables them.
Lane: `registry/district-lanes.json` (`financial`). Queue: Paperclip issues in district `financial`.

## Agents

Roster: `districts/financial/citizens.yaml` (one home per agent; role, status, done-means and judge for each). The runtime and its law are in `departments/financial/README.md`.

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Cost ledger | every model and tool cost recorded; unknown cost is never zero | skeptic |
| Budget guard | owner warned at 80% of the $100/month API budget; non-revenue work stops at 100% | owner |
| Monthly close | close package prepared for professional review, never filed | owner |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Payment adapters stay disabled or sandbox until the owner enables them.
- Bambú's House stays outside this district.

## Knowledge

- `departments/financial/README.md`
- `departments/financial/workflow.yaml`

## Standing jobs

Schedules fire only if the outcome is real; with nothing to do the agents sleep.

| When | Job | Outcome |
|---|---|---|
| daily 23:00 | Cost roll-up | daily spend per agent and district |
| monthly 1st | Close prep | close package for review |

## Human check

Bambú reads the budget line in the evening scoreboard.
