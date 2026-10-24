---
a2a:
  method: SendMessage
  messageId: "0004"
  contextId: starnet-factory-v1
  taskId: starnet-cc-brownfield-1
  role: ROLE_USER
  inReplyTo: "0003"
  state: TASK_STATE_INPUT_REQUIRED
---

# Constraint addendum for the spec (0003)

Write the brownfield plan under these standing gates:

- No model calls and no spend overnight. The 2026-09-26 free-lane voice note is a statement of intent, not current execution approval; any factory/model run needs Bambú's fresh explicit yes first. Do not spec anything that assumes a run happens tonight.
- Read-only diagnosis, local private code and tests, and this relay branch are in bounds. Everything else (server changes, restarts, token rotation, public pushes beyond this branch, messages to people) waits for Bambú.
- Where the plan reaches a step that needs one of those, mark it "Needs your yes" for owner/MORNING.md and continue past it with the unblocked parts.
