# 04_one_queue evidence

built_by: Claude (build session, 2026-11-16) · verified_by: (pending an independent reviewer)

## Repository proof
- `node test/one-queue.test.js` → 34 passed: schedules; every standing job in the real city names a roster agent;
  one mission per period; parked districts schedule nothing; unregistered agents reported (`AGENT_NOT_REGISTERED`);
  the mission carries district, builder and judge and its first stage is assigned to the named builder; the board
  shows RUNNING only from Paperclip missions; builder cannot judge itself; unknown districts refused.
- No regressions: factory.integration 66, factory-status 11, command-chain 20, district-foreman 48 (its pinned active
  lanes updated to the owner's 2026-11-16 decision), first-lanes 56, icm-walk 7.
- Lanes switched on (owner D10): revenue, creative, intelligence, financial, operations, experiment; `registry/districts.json`
  regenerated with `scripts/city/build-registry.js`.

## Live proof (server)
- Paperclip's issue status names (`todo`, `in_progress`, `in_review`, `blocked`, `done`, `cancelled`) are taken from
  the STARFACTORY-001 double; confirm them against the live Paperclip before trusting the board.
- Register every READY roster agent in Paperclip and in `FACTORY_ROLES`, then watch one weekday's standing jobs run.
