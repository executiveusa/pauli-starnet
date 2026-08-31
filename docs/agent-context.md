# PAULI STARNET — Heisenberg Sovereign Deployment
## Agent Context | 2026-08-30

---

## Repo Purpose
Turn the existing PAULI STARNET installation into a persistent, sovereign, voice-controllable AI business world with Heisenberg as First Mate and Revenue Commander.

## Stack
- **Runtime**: STARNET v0.10.12, Tauri shell, Node.js v24.17.0, npm 11.13.0
- **Sidecar**: Node.js (sidecar/ directory, port 8787 loopback)
- **Frontend**: Vanilla JS, Tauri WebView, sprites, world model
- **Capabilities**: team.dispatch, team.summon, web, cabinet, workbench, memory, studio, jukebox
- **Channels**: Telegram, Discord, Slack, Matrix, Signal (all implemented)
- **Build**: `npm run tauri build`, `npm run tauri dev`
- **Tests**: `node scripts/run-fast-tests.mjs`, `npm run test:http`

## Key Directories
```
C:\PAULI\pauli-starnet\          — main repo (branch: pauli/heisenberg-sovereign-wiring-20260830)
C:\PAULI\snapshots\              — pre-change workspace backups
C:\PAULI\launchers\              — desktop launcher scripts
C:\PAULI\scripts\                — utility scripts
C:\Users\execu\AppData\Roaming\ai.skynet.harness\workspaces\  — LIVE STARNET workspace
```

## Main Directories in Repo
- `sidecar/` — Node.js backend, agent loop, tool system, channel adapters
- `sidecar/skills/` — injectable skill docs (heisenberg-doctrine.md, heisenberg-crew-specs.js added here)
- `sidecar/providers/` — external API adapters (printify.js, etsy.js, unit-economics.js added here)
- `sidecar/mcp/` — MCP connectors (paulis-place-connector.js added here)
- `sidecar/capability/` — capability registry + consent system
- `sidecar/tools/builtin/` — built-in tool implementations (orchestration.js = team.dispatch)
- `sidecar/channels/` — Telegram, Discord, Slack, Matrix, Signal adapters
- `frontend/` — Tauri frontend (app.js, marketplace.js, voice.js, world model)
- `shared/` — UMD modules shared between frontend and sidecar
- `test/` — test suite (689 tests)

## Important Conventions
- **BROWNFIELD**: Inspect before changing. Preserve before extending. Reuse before adding.
- **No competing control plane**: STARNET is the sole runtime. Heisenberg is a persona+doctrine change to the primary agent.
- **Secrets never committed**: .env.local is gitignored. COSMOS.ENV never printed/echoed.
- **Capability consent**: All write/money/publish operations use `requiresConsent: true`.
- **Sidecar loopback only**: 127.0.0.1:8787 — never 0.0.0.0.
- **Integration branch**: `pauli/heisenberg-sovereign-wiring-20260830` (do not merge to feat/harness-backend without QA gate)

## Files Changed (This Session)

### In repo (committed to integration branch):
| File | Purpose |
|---|---|
| `sidecar/skills/heisenberg-doctrine.md` | Heisenberg operating doctrine (skill injected to primary agent) |
| `sidecar/skills/heisenberg-crew-specs.js` | 10-crew specId definitions for team.summon |
| `sidecar/providers/printify.js` | Printify POD adapter (read + consent-gated write) |
| `sidecar/providers/etsy.js` | Etsy adapter (read via API key; write via OAuth) |
| `sidecar/providers/unit-economics.js` | Unit economics schema + margin calculator |
| `sidecar/mcp/paulis-place-connector.js` | Pauli's Place MCP connector |
| `.env.local.template` | STARNET env template (names only, no values) |
| `.gitignore` | Added .env.local |

### Outside repo (live workspace, backed up):
| File | Change |
|---|---|
| `workspaces/agent.roster.json` | Primary agent: PAULI → Heisenberg, doctrine applied |
| `workspaces/.env.local` | COSMOS.ENV wired (28/28 configured, gitignored) |
| `workspaces/channels/secrets.json` | Telegram channel config seeded |

### Utility scripts:
| File | Purpose |
|---|---|
| `C:\PAULI\scripts\wire-cosmos-env.ps1` | COSMOS.ENV → .env.local wiring script |
| `C:\PAULI\launchers\start-pauli-starnet.ps1` | Windows desktop launcher |

## Decisions Made
1. **Heisenberg identity**: Renamed/redoctrined the existing primary agent (`agentId: 'agent'`) — NOT a new agent
2. **Crew as specIds**: All 10 crew roles defined as STARNET-compatible specialty specs for team.summon
3. **Providers as sidecar modules**: printify.js + etsy.js live in `sidecar/providers/` — follows existing pattern
4. **Pauli's Place MCP**: Thin connector in `sidecar/mcp/` exposing Pauli's Place FastAPI to STARNET
5. **Telegram via Tauri keychain**: Token must be entered via UI (Settings → Channels → Telegram) — cannot be scripted
6. **Etsy read-only only for now**: API key returns 403 (needs activation) — OAuth for write is a separate blocker

## Current Known Issues
1. **`checkpoint-default-on.test.js` PRE-EXISTING FAILURE**: Function `checkpointsEnabledFromEnv` not found by regex in `sidecar/index.js` — pre-dates this work, step 56/689
2. **Etsy API key 403**: ETSY_API_KEY in COSMOS.ENV returns "not active or not found" — Etsy key may need to be regenerated or is from a different app context. OAuth path also needed for write.
3. **Telegram token in keychain**: Must be entered via STARNET UI — cannot be scripted. Telegram voice lane is pre-configured but not yet connected.
4. **STARNET not yet built/installed**: The Tauri build hasn't been run yet. Running in live workspace from the existing installation.

## Test/Build Commands
```bash
# Fast test suite (baseline: fails at step 56/689 - pre-existing)
cd C:\PAULI\pauli-starnet
node scripts/run-fast-tests.mjs

# HTTP/sidecar API tests
npm run test:http

# Secret scan
node scripts/lint-evidence-secrets.mjs

# Guardian QA
node scripts/qa/guardian.mjs

# Build desktop app
npm run tauri build

# Dev mode (no build required)
npm run tauri dev
```

## Next Recommended Steps
1. **Telegram**: Open STARNET app → Settings → Channels → Telegram → paste bot token from COSMOS.ENV
2. **Etsy**: Investigate why ETSY_API_KEY returns 403 (check Etsy developer dashboard for key status/app approval)
3. **Crew loadout integration**: Wire `heisenberg-crew-specs.js` into the shared specialties catalog (add `require` in `shared/specialties.js` or companion registration file)
4. **Skill library registration**: Register `heisenberg-doctrine` in the skills library so STARNET loads it at agent boot
5. **Server deploy**: Use COOLIFY_URL + COOLIFY_API_TOKEN to deploy STARNET sidecar to server
6. **Tailscale tunnel**: Configure Tailscale using TAILSCALE_API_KEY for secure remote access
7. **Fix pre-existing test**: Investigate `checkpoint-default-on.test.js` failure in `sidecar/index.js`
8. **POD catalog search**: Run Printify catalog search for first product opportunity (Watcher + Revenue Scout dispatch)

## Rollback
```powershell
# Revert live workspace to pre-Heisenberg state:
Copy-Item -Recurse "C:\PAULI\snapshots\pre-heisenberg-live-workspace-20260830-212943\ai.skynet.harness" "$env:APPDATA\ai.skynet.harness"
# Delete integration branch:
git -C C:\PAULI\pauli-starnet checkout feat/harness-backend
git -C C:\PAULI\pauli-starnet branch -D pauli/heisenberg-sovereign-wiring-20260830
```
