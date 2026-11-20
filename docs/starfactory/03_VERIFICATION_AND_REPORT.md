# STARFACTORY-001 — Acceptance, Proof and Handoff

The implementation is not DONE because a PR exists or unit tests pass. Verify the live flow, auth boundaries, restart recovery and visible reality.

## Required checklist

| ID | Test | Required evidence | Result |
|---|---|---|---|
| T01 | Paperclip restart | Same mission before/after restart | NOT TESTED |
| T02 | Agent assignment | Real worker invocation ID | NOT TESTED |
| T03 | Two-worker handoff | Shared mission ID and trace | NOT TESTED |
| T04 | Independent QA | Separate reviewer run and verdict | NOT TESTED |
| T05 | Correction loop | Failed verdict followed by real repair | NOT TESTED |
| T06 | Crash recovery | Induced failure and restored progress | NOT TESTED |
| T07 | Duplicate event | Single effect / idempotency record | NOT TESTED |
| T08 | Pause | New tasks stay paused | NOT TESTED |
| T09 | Resume | Previously eligible work resumes | NOT TESTED |
| T10 | Approval gate | Restricted operation denied without approval | NOT TESTED |
| T11 | StarNet visualization | Screenshot aligned to server record | NOT TESTED |
| T12 | Phone voice | Authenticated spoken command and receipt | NOT TESTED |
| T13 | On-demand specialist | Real start, output, clean idle/stop | NOT TESTED |
| T14 | Budget cap | Real block at limit | NOT TESTED |
| T15 | Unauthorized access | 401/403 and no work performed | NOT TESTED |
| T16 | Emergency stop | No new jobs, safe inflight behavior | NOT TESTED |
| T17 | Artifact provenance | Commit/run/file linkage | NOT TESTED |
| T18 | Independent server operation | Desktop off, control service works | NOT TESTED |
| T19 | Long unattended workflow | Multi-hour task with zero manual handoffs | NOT TESTED |
| T20 | Truthful reporting | Dashboard matches authoritative logs | NOT TESTED |

The implementing agent fills each result with PASS/FAIL/BLOCKED, SHA, URL or private trace, environment, timestamp, and rollback. Do not mark tests complete without observing them.

## Final operator report template

### A. Executive result
Actual current state; blockers; production-ready or not.

### B. Live architecture
Host/service inventory, secure private access routes, authoritative database and current deployed SHA.

### C. Consolidation
KEEP / MERGE / PARK / ARCHIVE / proposed deletions. Record dependencies and required approvals.

### D. Implementation
Files, branches, PRs, commits, configs, migrations.

### E. Verification
20 tests with actual result and evidence pointer.

### F. Demonstration
Canonical mission ID, worker runs, assignments, handoffs, timestamps, independent review, delivered artifacts.

### G. StarNet visualization
Actual interface path and screenshots, linked to live mission state.

### H. Voice
Real phone-path test or precise blocker.

### I. Cost
Observed spend and usage, noting unavailable provider billing.

### J. Security
Who can command/approve/stop, negative tests, isolation, remaining issues.

### K. Rollback
Exact revision, backups, and procedure to restore baseline; no secrets in report.

### L. Next action
Single most important action, owner, approval requirement and commercial impact.

## Minimum slice

One non-production mission: Heisenberg creates canonical mission in Paperclip → Pi implements bounded change on branch → independent QA flags defect or approves → Pi revises if needed → Hermes or Heisenberg collects evidence → verified completion and owner approval hold. Induce at least one worker restart during this path. StarNet reads that live state. Only then expand to other specialists/voice and longer endurance tests.