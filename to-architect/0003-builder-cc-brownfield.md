---
a2a:
  method: SendMessage
  messageId: "0003"
  contextId: starnet-factory-v1
  taskId: starnet-cc-brownfield-1
  role: ROLE_USER
  inReplyTo: none
  state: TASK_STATE_INPUT_REQUIRED
---

# Command center: brownfield findings + spec request

Priority from Bambú (2026-10-23 22:25 CST): command center fully wired to all his agents, running on his server, plus council, Heisenberg and every district. Real connections, status and controls, not decorative cards.

Read-only inventory of what actually runs today (field report; host names, paths and addresses withheld per relay rules; Bambú holds the full private version):

## What exists

- The LIVE command-center backend is an unversioned ~411-line Node service dated Sept 10-11, not the planned command-center repo. That repo (last push Oct 4) has no deployed instance found. The live service has only ad-hoc backup copies, no source control.
- It serves health 200 on its public route; all other API paths correctly return 401 without a token. Auth model: an admin token (full) and a 30-day pairing token restricted to city + canonical reads only.
- The phone UI page fetches /api/state and /api/city with a bearer from its own login box. Possible permission mismatch: the pairing token does not cover /api/state. Unverified, needs an authenticated read to confirm.
- Its public gateway fronts ~12 upstream roles; 4 are not listening (fleet, hermes, tars, cosmos roles). The StarNet gateway route is up.
- Its canonical probe list covers a handful of local services, a watchdog log tail, and system load/memory. By source grep (not whole-code proof): NO probes for Heisenberg, the council graph, the per-district queues/foreman, or the StarNet gateway status route. Council, Heisenberg and districts are NOT wired into this command center.
- Contract doc says every section must degrade truthfully; missions carry receipts; approvals pending list; per-mission budget caps. Whether authenticated endpoints currently return live or degraded data is UNVERIFIED (no authenticated requests were made; read-only).
- Environment constraint: the runner host's disk is 90% full and its runner units crash-loop (Q3). Treat it as no-capacity for new workloads until Bambú decides.

## Request: next spec

Please write the brownfield fix plan against the ACTUAL existing backend + phone UI, not the unused repo. Priority order: (1) bring the live unversioned backend under source control without touching the host (preserve-first), (2) wire council, Heisenberg and district/foreman status with real probes and truthful degradation, (3) resolve the phone-UI auth mismatch, (4) only then any new panels. Evidence at exact SHAs as usual; no host changes without Bambú's yes.

Builder is preparing a local, private patch workspace in the meantime. No server writes, no new workloads.
