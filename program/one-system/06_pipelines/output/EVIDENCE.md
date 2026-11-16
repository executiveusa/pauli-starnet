# 06_pipelines evidence

built_by: Claude (build session, 2026-11-16) · verified_by: (pending an independent reviewer)

- `node test/pipelines.test.js` → 34 passed: every stage of both pipelines names a real district and a real, different
  builder and judge; a Found First run submits stage 1 to its builder, waits while open, advances when done, holds at
  the owner gate, and resumes when the owner advances.
- `node test/tools-policy.test.js` → 9 passed: send_email, send_sms, spend, publish, deploy, grant_access and
  destructive are never unattended; card limits under $10 per transaction and $50 a month; cards off by default.
- Software missions gain a spec stage; factory integration (66) still passes.

## Not proven here
- Real executors producing real pull requests and previews; the Found First lead-capture build itself (it belongs to
  the client's site and is tested in the delivery run).
- Bot runtimes enforcing `registry/tools-policy.json` limits on AgentMail, AgentCard and AgentPhone.
