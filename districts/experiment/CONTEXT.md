# Experiment district — bounded tests

One job: run cheap, reversible experiments with a written hypothesis, a success number and a stop rule.
Lane: `registry/district-lanes.json` (`experiment`). Queue: Paperclip issues in district `experiment`.

## Agents

Roster: `districts/experiment/citizens.yaml` (one home per agent; role, status, done-means and judge for each). 

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Experiment | experiment card with hypothesis, metric, stop rule, result and keep/kill decision | skeptic |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- One experiment per offer at a time; no experiment spends money or contacts anyone without approval.

## Knowledge

- `districts/middleton/canon/metrics.md` (what to measure)

## Standing jobs

Schedules fire only if the outcome is real; with nothing to do the agents sleep.

| When | Job | Outcome |
|---|---|---|
| weekly Fri 15:00 | Experiment review | keep/kill recorded for each running card |

## Human check

Bambú approves each experiment card before it starts.
