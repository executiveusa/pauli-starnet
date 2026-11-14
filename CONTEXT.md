# CONTEXT - pauli-starnet

## What this is
Features. **A living pixel-art station where real AI agents do real work.**

## Top-level layout
- `AGENTS.md`
- `AGENTS_DONE.md`
- `CODE_MAP.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `INSTALL.md`
- `KNOWLEDGE.md`
- `LICENSE`
- `NOTICE.md`
- `PRIVACY.md`
- `README.md`
- `RELEASE_NOTES.md`
- `SECURITY.md`
- `TERMS.md`
- `bamboo_house/` 12 files
- `creative/` 28 files
- `db/` 1 files
- `departments/` 6 files
- `deploy/` 6 files
- `dev/` 144 files
- `districts/` 928 files
- `docs/` 240 files
- `financial_district/` 4 files
- `fixtures/` 1 files
- `frontend/` 5251 files

## Working here
1. Run `trail map` for orientation before grepping (this repo gitignores AGENTS.md by policy, so the Trail wiring lives here: `trail map/ask/grep/skeleton/callers`, cache in `.trail/cache/`, learnings in `.trail/learnings/`).
2. Do not move or rename existing files without checking `trail callers` for what depends on them.
3. Session learnings belong in `.trail/learnings/`.

## Build / test (package.json scripts)
- `npm run validate:raw`
- `npm run test:http`
- `npm run test:http:raw`
- `npm run test:fast`
- `npm run test:fast:raw`
- `npm run test`
- `npm run test:jev`
- `npm run website:stage`
- `npm run website:stage:check`
- `npm run start`
- `npm run mcp:serve`
- `npm run acp:serve`
