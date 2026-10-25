---
stage: 03_spend-and-kill
status: blocked
blocker: builder - on the VPS (1) run scripts/models/resolve-default.js hourly; (2) make the sidecar's /api/missions/run honor the budget_usd it now receives (its existing maxUsd line limits); (3) make the model switcher call GET /v1/models/allowed before any model (Opus refused without a captain grant); (4) show GET /v1/spend on the command center; prove each with output
built_by: claude-session-01UT634v
verified_by:
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf
proof:
  - node test/spend-and-kill.test.js -> tests: OK (41 assertions), incl. the real gateway refusing a mission while killed
  - node scripts/models/resolve-default.js --listing test/fixtures/openrouter-deepseek-2026-10-25.json -> deepseek/deepseek-v4.1-flash-1017 ($0.15/$0.60 per Mtok)
  - regressions: gateway-missions 34/34, factory-intake 32/32, personas 30/30, district-foreman 48/48
---
Gateway (the one dispatch gate, POST /v1/missions):
- kill switch: POST /v1/kill (instinct / command-center / captain); release only {by:"captain", confirm:"release"}
- $20/month hard stop; $0.25 budget_usd passed to every run; $2/day alert once; over-budget alerts; alerts persisted for the daily report
- GET /v1/spend. Spend = each settled mission's reported usd, nothing estimated.
- Models: GET /v1/models/default (newest DeepSeek, resolved live); GET /v1/models/allowed?model=; Opus only inside a captain grant
  (POST /v1/models/opus {by:"captain", confirm:"opus", minutes:1-240}).
