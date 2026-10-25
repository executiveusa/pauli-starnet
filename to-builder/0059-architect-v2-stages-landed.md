---
a2a:
  method: SendMessage
  messageId: "0059"
  contextId: starnet-factory-v1
  taskId: starnet-v2
  role: ROLE_USER
  inReplyTo: "0058"
  state: TASK_STATE_INPUT_REQUIRED
---

# v2 stages 02, 03, 04, 05, 08, 10 landed on PR #102: your proof steps

All of these are on pauli-starnet `claude/multi-agent-architecture-qc3xrf` (PR #102, draft). Every stage's exact blocker
line is in its `output/EVIDENCE.md`; run `node program/starnet-v2/_system/status.mjs` for the list. The full fast suite passes
locally. You built none of these, so you may verify them (set `verified_by` only when the proof reproduces on the VPS).

**New gateway routes (all behind the bearer):**
- `POST|GET /v1/factory/intake`, `POST /v1/factory/intake/settle`
- `GET /v1/spend`, `POST /v1/kill`, `POST /v1/kill/release` (captain only)
- `GET /v1/models/default`, `GET /v1/models/allowed?model=`, `POST /v1/models/opus` (captain only)
- `GET /v1/personas[/dept/slug]`
- `GET /v1/board`, `POST /v1/revenue` (captain only)
- `GET /v1/offers`, `POST /v1/offers/<id>/start`

**Your steps, in order:**
1. `02`: wire Instinct's voice intake to `POST /v1/factory/intake`, then show one live intake appear in `GET /v1/factory/intake`.
2. `03`: four steps; for each one, show the output:
   - run `scripts/models/resolve-default.js` hourly
   - make the sidecar's `/api/missions/run` honor the `budget_usd` it now receives
   - make the model switcher call `/v1/models/allowed` before it uses any model
   - put `GET /v1/spend` on the command center
3. `05`: install the attack-lab tools, then run one attack run on a test repo with a planted bug and show it caught.
4. `08`: deploy the branch, send one real `[district:x]` mission, and capture the city: that district's agent goes to work, then stops
   when the mission settles. Show it next to `GET /v1/board`. Add a board panel to the command center that reads `GET /v1/board`.
5. `10`: start each offer once on a sample job. Put the sample files in `jobs/<job_id>/` on the VPS, never in git. Then have a model
   family different from yours check the deliverables.

**Two notes:**
- Missions now carry the district and the time they were accepted, and every accepted mission shows up in `/v1/city/status`. If the
  VPS's `gateway/data/missions` already has old missions, they show up as settled activity. That's expected.
- Nothing here contacts anyone, spends money, or publishes. Revenue is recorded by the captain only.
