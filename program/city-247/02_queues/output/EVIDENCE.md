---
stage: 02_queues
status: done
built_by: claude-session-01UT634v
verified_by: ""
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf (this commit)
proof:
  - node test/district-foreman.test.js (raw below): unit decisions + an end-to-end run through the real gateway,
    mission desk and a stub crew, with only GitHub stubbed
  - node scripts/city/build-registry.js --check
blocker: ""
---

Run on 2026-10-15 in the builder's container. Not the production server; the timer has not run there yet.

```
$ node test/district-foreman.test.js
district-foreman.test: OK (42 assertions)
$ node scripts/city/build-registry.js --check
registry/districts.json is current
```

The generated registry (12 CitySpec districts):

```
crypto-cuties  idle    cap $1 retries 3 knowledge: -
pauli          idle    cap $1 retries 3 knowledge: -
command        idle    cap $1 retries 3 knowledge: mozi-sales
production     ACTIVE  cap $1 retries 3 knowledge: jasper-smart-sites
revenue        idle    cap $1 retries 3 knowledge: mozi-sales,manny-hormozi-315,email-copywriter,jake-trinder-20,middleton-method,jasper-smart-sites,closer-sales-call-stages
impact         ACTIVE  cap $1 retries 3 knowledge: monica-main,cause-specialist
creative       idle    cap $1 retries 3 knowledge: metricsmule-video,email-copywriter,jake-trinder-20,stefan-3d
commerce       ACTIVE  cap $1 retries 3 knowledge: mozi-sales,metricsmule-video,androoagi-study
intelligence   idle    cap $1 retries 3 knowledge: -
experiment     idle    cap $1 retries 3 knowledge: -
financial      idle    cap $1 retries 3 knowledge: monica-main
operations     idle    cap $1 retries 3 knowledge: -
```

What the end-to-end test proves, tick by tick:
- Tick 1: Impact's approved issue #21 is dispatched as mission `d-impact-21-a1` with cited passages from its own
  transcripts in the brief; Commerce asks for approval of #22; Production refuses to run `repo.write` unattended;
  inactive districts are IDLE.
- The mission desk settles the mission `done` through the stub crew.
- Tick 2: the result folds back (finished, spend counted), the issue gets a result comment and `needs-review`;
  `GET /v1/districts` serves the board with its age. Without FOREMAN_GITHUB_WRITE=1 the foreman only reads GitHub.

Not proven here: the timer on the server, real GitHub issues, a real crew model run.
