---
stage: 06_factory-v2
status: blocked
blocker: builder - (1) create the Coolify preview area on the VPS and one preview app for the first target; make the app serve its commit at /.well-known/build-sha (Coolify "include source commit in build" -> SOURCE_COMMIT) and sit behind basic auth; (2) in vibe-engineering settings create the vibe-preview environment with secret VIBE_PREVIEW_DEPLOY_TOKEN (Coolify API token scoped to the preview area, from the vault) + VIBE_PREVIEW_ACCESS, variables VIBE_PREVIEW_COOLIFY_URL / VIBE_PREVIEW_APP_UUID / VIBE_PREVIEW_URL / VIBE_PREVIEW_LIVE_PATHS, and STARNET_GATEWAY_URL + secret STARNET_GATEWAY_TOKEN; (3) confirm on your Coolify version that PATCH /api/v1/applications/<uuid> accepts git_commit_sha (if not, say so: the deploy step fails closed at "pin"); (4) run one factory job end to end and attach the deploy receipt showing served_build_sha == the judged commit
built_by: claude-session-01UT634v
verified_by:
commit: executiveusa/vibe-engineering@factory/v2-exit-bar-preview-deploy + executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf
proof:
  - vibe-engineering npm test -> 122/122 (9 new in tests/factory-exit-bar.test.mjs, faked Coolify + preview: the deploy step makes no request until the judge and security pass; the deploy-only token goes only to Coolify, never to the preview or the receipt; every failure stage holds)
  - pauli-starnet node test/factory-intake.test.js -> 40/40 (captain-only morning approval for assumed-answer intakes)
---
Architect half of stage 06, in vibe-engineering:
- **Exit bar** (`factory/exit-bar.mjs`): PRD section 8 for one commit. Judge SHIP with exit_bar (backend features with tests,
  UDEC >= 8.5, zero slop), two security runs with no HIGH/CRITICAL, three model families, and the deploy step's preview proof.
- **Separate deploy step** (`factory/deploy-preview.mjs`, `.github/workflows/factory-preview-deploy.yml`): the only holder of the
  deploy credential; no model keys, no agent. A reviewer on the vibe-preview environment makes each deploy the one-tap yellow.
- **StarNet source** (`scripts/select-starnet-intake.mjs`): `VIBE_TARGET_SOURCE=starnet`; queued rows only; assumed-answer rows
  wait for POST /v1/factory/intake/approve (captain). `scripts/report-starnet-intake.mjs` settles the verdict back.

Known gap, not this stage's to fix silently: the existing "Open pull request" step pushes with FLEET_GITHUB_TOKEN after the
workflow verifies that same token is read-only, so a real (non-dry) run cannot push its branch yet. The PRD says the builder
holds a read-only token; the push needs its own narrowly scoped credential in a step no agent reaches. Captain/builder decision.
