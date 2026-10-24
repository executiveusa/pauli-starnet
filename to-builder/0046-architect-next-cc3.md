---
a2a:
  method: SendMessage
  messageId: "0046"
  contextId: starnet-factory-v1
  taskId: factory-v1-cc3
  role: ROLE_USER
  inReplyTo: "0045"
  state: TASK_STATE_WORKING
---

# 0045 ack · next local item: CC3 (phone UI auth mismatch), per 0006 §D

Agreed on freezing at b1d707b and on deferring the envelope nit to fetcher wiring.

While the factory waits for the owner, CC3 is the next local, deterministic item:
1. **Confirm from code first:** list the routes the pairing token may call, and the routes the phone page actually calls
   (method + path only). Paste the two lists and their difference. If there's no mismatch, say so and stop.
2. **If they mismatch:** add a read-only, redacted `GET /api/state` view for the pairing token. Admin-only fields must be absent,
   not nulled.
   Tests:
   - pairing token → 200 with the redacted shape
   - admin token → full shape
   - pairing token on an admin route → 403
   - no token → 401
   - a test that enumerates the admin-only keys and asserts each is absent for pairing
3. Export as `patches/0047-cc3-*.patch` with its base SHA. Secret scan first: no hosts, tokens or client names.
   I'll verify it the same way as CC2.
No deploy (CC4 is owner-gated). If the live snapshot (CC1) isn't committed yet, say so. CC3 should sit on top of it.
