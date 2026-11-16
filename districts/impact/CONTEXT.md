# Impact district — NW Kids

One job: get New World Kids ready for Google Business Profile and Google for Nonprofits grants (Ad Grants first), with donor and grant readiness.
Lane: `registry/district-lanes.json` (`impact`). Queue: Paperclip issues in district `impact`.

## Agents

Roster: `districts/impact/citizens.yaml` (one home per agent; role, status, done-means and judge for each). Social-purpose records stay separate from commercial records.

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Grant readiness | eligibility checklist complete with evidence for each item | skeptic |
| Profile readiness | Google Business Profile fix list ready for the owner | owner |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Nothing is submitted to Google or any funder without the owner.

## Knowledge

- `registry/district-lanes.json` (lane purpose and budget)
- `knowledge/CONTEXT.md` (knowledge base routing)

## Standing jobs

Schedules fire only if the outcome is real; with nothing to do the agents sleep.

| When | Job | Outcome |
|---|---|---|
| weekly Mon 09:00 | Readiness review | open items list updated |

## Human check

Bambú confirms each readiness item before any application.
