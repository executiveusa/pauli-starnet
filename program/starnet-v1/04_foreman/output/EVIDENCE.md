---
stage: 04_foreman
status: done
built_by: claude-session-01UT634v
verified_by: ""
commit: executiveusa/pauli-starnet (branch claude/multi-agent-architecture-qc3xrf, PR #41)
proof:
  - https://github.com/executiveusa/pauli-starnet/pull/41
blocker: ""
---
$ node test/e2e.foreman-mission.test.js      (real sidecar, mock model, no Full Access)
e2e.foreman-mission.test: OK (14 assertions)
  two real crew runs (scout-a, scout-b) dispatched unattended and merged; non-GREEN refused with no model call;
  team.summon denied; route needs the station token.
$ (sidecar/permissions.js reverted) node test/e2e.foreman-mission.test.js
FAIL: two real crew runs were dispatched: []
e2e.foreman-mission.test: 3 problem(s), 11 ok
$ node test/permissions.test.js       permissions.test: OK (83 assertions)
$ node test/gateway-missions.test.js  gateway-missions.test: OK (25 assertions)

Found and fixed on the way: sidecar/index.js had not parsed since ce87544d (2026-09-17, a literal "\n" pasted
into line 100), so the sidecar could not boot from feat/harness-backend. Fast suite, every test run on its own,
base vs this branch: this branch fixes 7 failing tests (boot-security, sidecar-fixture, sidecar.security,
workshop-undo, workshop-implement, schema-stamp, mcp-serve) and adds no new failure. The 7 still failing fail
identically on base (qa-product-perfect-claims, crt-context-loss, opensource-readiness, website-app-sync,
lint-determinism, failopen-ratchet, city-web). The lint-determinism and failopen-ratchet findings are identical.
