# 02_walk_test evidence

built_by: Claude (build session, 2026-11-16) · verified_by: (pending an independent reviewer)

- `node scripts/icm/walk.js` → WALK TEST PASS: 12/12 districts, 51 agents.
- `node test/icm-walk.test.js` → 7 assertions passed; registered in `test/fast.list`.
- The walk is file-only (no model calls), so the result is the same for every model. A live check that a cheap model
  and a strong model reach the same district and judge from the same files belongs to `08_activation`.
