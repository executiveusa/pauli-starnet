# 01_roles evidence

built_by: Claude (build session, 2026-11-16) · verified_by: (pending an independent reviewer)

## Repository proof (run here)
- `node test/command-chain.test.js` → 20 assertions passed: Instinct leads while fresh, Heisenberg acts when stale or
  never seen; succession passes Instinct's powers only; owner-only actions never pass; the builder cannot judge its
  own work; stall sweep nudges once, escalates once, never repeats.
- `node test/factory-status.test.js` → 11 passed; `node test/factory.integration.test.js` → 66 passed (no regression).

## Live proof (not run; needs the server)
- Instinct sends real heartbeats; stop them for 6 minutes and `GET /v1/factory/chief` reports Heisenberg acting.
- A real stalled Paperclip issue receives one `heisenberg-nudge` comment and its agent is re-woken.
