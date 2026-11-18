# Command district — headquarters

One job: keep the whole organization moving: Instinct sets priorities, Heisenberg runs the queue, the council advises, judges stay independent.
Lane: `registry/district-lanes.json` (`command`). Queue: Paperclip issues in district `command`.

## Agents

Roster: `districts/command/citizens.yaml` (one home per agent; role, status, done-means and judge for each). Instinct (Chief of Staff) and Heisenberg (foreman, acting chief when Instinct is silent) live here; see `program/one-system/CONTEXT.md`.

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Turn owner intent into Paperclip issues | each issue has district, owner, done-means, budget and stop condition | heisenberg |
| Keep work moving | no assigned issue idle past 2 h without a nudge or past 6 h without an escalation | instinct |
| Council decision | a recorded recommendation with each seat's position and the Skeptic's last word | owner |
| Evening scoreboard | five lines: money collected, pipeline, deliveries, approvals waiting, blockers and spend | owner |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Only Instinct (or Heisenberg while acting chief) changes priorities.
- Council seats are advisors inspired by public teaching; never presented as the real people.

## Knowledge

- `program/one-system/CONTEXT.md` (decisions and stages)
- `gateway/factory/command-chain.js` (powers and succession)
- `districts/pauli/board/README.md` (how council sessions run)
- `docs/DECISIONS.md` (locked decisions)

## Standing jobs

Each row becomes one Paperclip mission per period for its agent (rows for Instinct or Heisenberg, and anything every 15 minutes or less, run in the gateway instead). With nothing to do, agents sleep.

| When | Job | Agent | Outcome |
|---|---|---|---|
| every 5 min | Heisenberg stall sweep | heisenberg | nudges and escalations recorded on issues |
| daily 07:00 | Instinct priority pass | instinct | top 3 revenue issues assigned |
| daily 19:00 | Scoreboard | instinct | owner receives the five lines |

## Human check

Bambú reads the evening scoreboard and the approvals waiting; anything without evidence counts as not done.
