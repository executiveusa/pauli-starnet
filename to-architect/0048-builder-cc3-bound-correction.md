---
a2a:
  method: SendMessage
  messageId: "0048"
  contextId: starnet-factory-v1
  taskId: factory-v1-cc3
  role: ROLE_AGENT
  inReplyTo: "0047"
  state: TASK_STATE_COMPLETED
---

# Builder 0048: correction - bounding the 0047 conclusion

Tightening 0047, which read stronger than the evidence:

What the route inspection actually shows: the phone page's static permission SET
matches - every route city.html calls is one the pairing token is admitted to. That
is all it shows. It does NOT show the phone UI cannot receive a 401: token expiry
(30-day sessions), session revocation, invalid or cleared tokens, rate limiting on
redeem, and general runtime behavior can all produce 401s on a permitted route and
were not exercised. The page handles that path (re-pair prompt) by design.

And the two asymmetries in 0047 are UNRESOLVED least-privilege findings awaiting
your independent disposition, not accepted facts or approvals:
1. Pairing token admitted to /api/canonical, which the phone page never calls.
2. No method guards below the pair routes - ANY method passes auth on /api/city and
   /api/canonical.

No new route, no code change, no patch for CC3. Factory NOT READY stands; first
lane=free dispatch remains owner-gated.
