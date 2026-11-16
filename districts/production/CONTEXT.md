# Production district — the software factory

One job: take a project from GitHub through the vibe-engineering pipeline to an independently reviewed change.
Queue: `district:production` issues. Owner: "the software factory is the highest leverage thing right now".

## Pipeline (loop engineering, brownfield first)
INTAKE (issue with repo + goal) → INSPECT (read-only: what exists, what runs, tests, blast radius) → SPEC → SLICE →
BUILD (in a branch, never on main) → VERIFY (tests run by the builder) → REVIEW (`starnet/review-gate`: SHIP/HOLD
by a separate reviewer on the exact commit) → RELEASE (owner) → LEARN.

## Unattended vs owner
- Unattended (`research`): intake, inspection reports, specs, slice plans, using routed knowledge
  (Jasper smart-site flow A–C, Mozi offers).
- Needs the owner (`perm:repo.write`, `perm:deploy`): branches, PRs, deploys. The foreman blocks these with a
  question instead of running them. A PR is never merged by the factory.

## First work (seeded issues, waiting for approval)
Smart-site factory from the Jasper logic (HVAC demo first, then roofing and the GOAT directory), and a
brownfield inspection of each target repo before any build.

## Agents

Roster: `districts/production/citizens.yaml` (one home per agent; role, status, done-means and judge for each). The software-factory stages are above; this charter adds who does each.

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Spec | written spec with acceptance criteria, approved by Instinct | instinct |
| Build slice | branch with tests passing, never on main | qa-judge |
| Independent review | SHIP or HOLD on the exact commit by someone who did not build it | skeptic |
| Release | owner approval recorded; rollback written | owner |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Coding runs in an isolated sandbox (Cloudroom) until StarNet's own sandbox is qualified.
- Standard: `executiveusa/vibe-engineering`.

## Knowledge

- `docs/starfactory/12_ACCEPTANCE_AND_HANDOFF.md`
- `districts/pauli/board/seats/matt-pocock.md`

## Standing jobs

Schedules fire only if the outcome is real; with nothing to do the agents sleep.

| When | Job | Outcome |
|---|---|---|
| every 30 min | Pick up approved build issues | work started or blocked with a question |

## Human check

Bambú approves releases to production and reads the rollback note.
