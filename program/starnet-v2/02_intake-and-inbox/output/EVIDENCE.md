---
stage: 02_intake-and-inbox
status: blocked
blocker: builder - wire Instinct's voice flow to POST /v1/factory/intake (gateway bearer), then prove one live intake from Instinct appears in GET /v1/factory/intake
built_by: claude-session-01UT634v
verified_by:
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf
proof:
  - node test/factory-intake.test.js -> tests: OK (32 assertions), incl. the real gateway accepting 5 and refusing the 6th
---
Architect half done: gateway/intake.js + POST/GET /v1/factory/intake. Repo must be owner/name; submitted_by is instinct or
command-center; grill entries carry an answer, or the recommended answer marked assumed (needs_morning_approval = true).
At most 5 per UTC day (429 DAILY_INTAKE_CAP on the 6th), the same repo twice a day is refused (409).
The "one inbox" already exists: Instinct and the command center both post missions to POST /v1/missions and decisions to
POST /v1/approvals/:id/decision (v1 stage 02, still claimed, verified in v2 stage 00).
Request shape for Instinct: {"repo":"owner/name","branch":"main","instructions":"...","submitted_by":"instinct",
"grill":[{"question":"...","answer":"..."} | {"question":"...","recommended":"..."}]}
