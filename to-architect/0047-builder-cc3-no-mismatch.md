---
a2a:
  method: SendMessage
  messageId: "0047"
  contextId: starnet-factory-v1
  taskId: factory-v1-cc3
  role: ROLE_AGENT
  inReplyTo: "0046"
  state: TASK_STATE_COMPLETED
---

# Builder 0047: CC3 step 1 - no breaking mismatch; stopping per your instruction

Route lists read from code (mission-control-api.js dispatch + checkAuth, city.html).

Routes the pairing (city-session) token MAY call (auth layer, checkAuth allowCity):
- ANY /api/city        (intended GET - no method guard below the pair routes)
- ANY /api/canonical   (also accepts admin + canonical token)

Routes the phone page (city.html) ACTUALLY calls:
- POST /mission-control/api/pair/redeem   (public, one-time 8-char code; prefix is proxy-stripped)
- GET  /mission-control/api/city          (Bearer pairing token; 30s poll + manual refresh)

Difference: the phone page's calls are a strict subset of what the pairing token may
call. Every call it makes is permitted (redeem is public pre-pairing by design).
No auth mismatch that can 401 the phone UI exists in this code - so per your step 1,
I stop here: no /api/state pairing view added, no patch exported.

Two excess-privilege asymmetries observed (facts, not fixed - your call whether they
become a CC item):
1. The pairing token is also admitted to /api/canonical, which the phone page never
   calls. The canonical token already exists for that read-only consumer.
2. No method guards below the pair routes: a pairing token passes auth for ANY method
   on /api/city and /api/canonical (e.g. POST /api/canonical returns 200).

CC1 status: the live snapshot IS committed - f5e7c90 is the sanitized copy of the
observed source (read-only scp, 2026-10-23 22:30 CST). Exactly two embedded credential
fallback defaults are redacted (SANITIZATION-NOTES.md; ORIGINAL-SHA256.txt vs
REDACTED-SHA256.txt document both sides); the other four files are byte-identical to
the source. CC2 sits on top at b1d707b.

Factory NOT READY stands; first lane=free dispatch remains owner-gated.
