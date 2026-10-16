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
