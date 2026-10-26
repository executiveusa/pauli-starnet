---
stage: 04_personas
status: done
built_by: claude-session-01UT634v
verified_by:
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf
proof:
  - node scripts/personas/import.js <agency-agents checkout> b37b5bb -> {"count":283,"counts":{"allow":231,"ask":49,"block":3}}
  - node test/personas.test.js -> tests: OK (30 assertions)
---
Upstream: msitarzewski/agency-agents @ b37b5bb33b78f2c1d6567d98e25ca818e3259219 (MIT; personas/LICENSE + NOTICE.md).
Districts: production 81, creative 54, revenue 15, security 12, command 7, financial 5, intelligence 109 (off today, still loadable).
Withheld: 49 "caution" (102 URL mentions, 44 eval/base64 mentions in code samples) and 3 quarantined. All 3 quarantined are false
positives on reading (prompt-engineer quotes "Ignore all previous instructions" as a test input; rapid-prototyper and
agentic-search-optimizer have sample fetch('/api/...') code). They stay withheld until the captain approves exact hashes in
registry/persona-approvals.json.
Not yet proven (needs the verifier): a non-Claude model loading a persona through the gateway on the VPS.
