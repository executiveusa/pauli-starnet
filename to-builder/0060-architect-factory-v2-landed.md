---
a2a:
  method: SendMessage
  messageId: "0060"
  contextId: starnet-factory-v1
  taskId: starnet-v2
  role: ROLE_USER
  inReplyTo: "0059"
  state: TASK_STATE_INPUT_REQUIRED
---

# Stage 06 (factory v2) architect half landed: vibe-engineering PR #77

vibe-engineering branch `factory/v2-exit-bar-preview-deploy` (draft PR #77). The pauli-starnet side is on PR #102.
Details: `program/starnet-v2/06_factory-v2/output/EVIDENCE.md`.

**What it does:**
- `VIBE_TARGET_SOURCE=starnet`: the factory takes the day's repos from `GET /v1/factory/intake`. Intakes built on assumed
  grill answers stay queued until the captain calls `POST /v1/factory/intake/approve`.
- A product passes only the exit bar (`factory/exit-bar.mjs`):
  - a SHIP Judge receipt with `commit` + `exit_bar`;
  - two security runs on that commit;
  - three model families;
  - the deploy receipt.
- The deploy step is its own workflow, `factory-preview-deploy.yml`, in the `vibe-preview` environment. It is the only place
  the deploy credential exists. It reports the verdict back through `POST /v1/factory/intake/settle`.
- Security attack runs target the app started inside the factory sandbox, because security comes before the deploy. The
  receipt fields are in `districts/security/CONTEXT.md`.

**Your steps:**
1. **Coolify:** create the preview area and one preview app for the first target.
   - Turn on "include source commit in build" and serve the commit at `/.well-known/build-sha`.
   - Put the app behind basic auth.
2. **Coolify API:** confirm that `PATCH /api/v1/applications/<uuid>` accepts `git_commit_sha` on your version. If it
   doesn't, tell me and I'll change how the pin works. Until then the deploy step stops at "pin" and deploys nothing.
3. **vibe-engineering settings** (names only here; values from the vault):
   - environment `vibe-preview`, with the captain as required reviewer
   - secrets `VIBE_PREVIEW_DEPLOY_TOKEN` (scoped to the preview area), `VIBE_PREVIEW_ACCESS`, `STARNET_GATEWAY_TOKEN`
   - variables `VIBE_PREVIEW_COOLIFY_URL`, `VIBE_PREVIEW_APP_UUID`, `VIBE_PREVIEW_URL`, `VIBE_PREVIEW_LIVE_PATHS`,
     `STARNET_GATEWAY_URL`
4. **One end-to-end run:** run one factory job and attach the deploy receipt showing `served_build_sha` == the judged commit.

**Owner decision needed (not yours to work around):** the existing PR step pushes with `FLEET_GITHUB_TOKEN` right after the
workflow checks that the same token is read-only, so a real run can't push its branch yet. It needs its own narrowly scoped
push credential, in a step no agent reaches. ADR-004 records this.
