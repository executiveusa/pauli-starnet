---
stage: 04_first_lanes
status: blocked
built_by: claude-session-01UT634v
verified_by: ""
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf (this commit)
proof:
  - node test/first-lanes.test.js (raw below)
  - a live, read-only foreman tick against GitHub (raw below)
  - the queue labels created on executiveusa/pauli-starnet (raw below)
blocker: "Owner: turn on Issues for executiveusa/pauli-starnet (Settings > General > Features > Issues). Then run node scripts/queue/seed.js program/city-247/04_first_lanes/seed-issues.json with a GITHUB_TOKEN (it creates the 8 seed issues, unapproved) and add the label approved to the ones you want run."
---

Lanes: `districts/production/CONTEXT.md` (software factory), `impact/LANE.md` (NW Kids Google profile and Google
nonprofit grants), `districts/commerce/CONTEXT.md` (Freedom of Speech store, test-only) with
`districts/commerce/etsy/listing.js` (draft payloads only, no network code). Seed work:
`program/city-247/04_first_lanes/seed-issues.json` (8 issues, none pre-approved).

```
$ node test/first-lanes.test.js
first-lanes.test: OK (56 assertions)
```

Live tick from the builder's container on 2026-10-15 (real GitHub, read-only; local gateway, no crew):

```
crypto-cuties IDLE     lane not active yet
pauli         IDLE     lane not active yet
command       IDLE     lane not active yet
production    BLOCKED  Queue executiveusa/pauli-starnet cannot be read: Issues are disabled on this repo (enable them: Settings > General > Features > Issues)
revenue       IDLE     lane not active yet
impact        BLOCKED  Queue executiveusa/pauli-starnet cannot be read: Issues are disabled on this repo (enable them: Settings > General > Features > Issues)
creative      IDLE     lane not active yet
commerce      BLOCKED  Queue executiveusa/pauli-starnet cannot be read: Issues are disabled on this repo (enable them: Settings > General > Features > Issues)
intelligence  IDLE     lane not active yet
experiment    IDLE     lane not active yet
financial     IDLE     lane not active yet
operations    IDLE     lane not active yet
errors: ["queue executiveusa/pauli-starnet: Issues are disabled on this repo (enable them: Settings > General > Features > Issues)"]
GET /v1/districts -> 200 districts 12 stale false
```

Queue labels now on executiveusa/pauli-starnet (created by the seed before it hit the disabled Issues setting):

```
approved blocked district:commerce district:impact district:production needs-review perm:repo.write 
```

What this shows: the city does not pretend. With Issues off, the three active districts are BLOCKED with the exact
setting to change; the other nine are IDLE because their lanes are not active yet. Two bugs were found by running it
live and fixed in this commit: an unreadable queue had been reported as an empty one (IDLE), and GitHub returns an
empty list for issues when Issues are off, which also looked empty.

Not proven here: seeded issues (blocked on the setting), a real crew run on the server, Etsy's live spec (etsy.com is
not reachable from this container; fields marked UNVERIFIED in the module).
