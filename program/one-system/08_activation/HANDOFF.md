# 08_activation — turning it on (for Instinct, with Bambú's approvals)

Everything here is built and tested in the repository. Nothing has run against the live servers. This file is the
ordered list to make it live, the tests that prove it, and the rollback. Corrected 2026-11-16 after Instinct's
activation review (findings 1 to 8); what changed is listed at the end.
Server facts from Instinct's census: two 2 CPU / 8 GB boxes; .209 (prod-city-1) runs the active backend from
`feat/jmo-skills-picks-clean`; .212 runs `feat/harness-backend`. Both checkouts have uncommitted runtime changes.

## Before anything (owner decisions and gates)
1. **Reviewer (owner decision 2026-11-16: Claude on the owner's subscription, model picked per review).** Merge
   `executiveusa/pauli-starnet#110` first (the Claude Review workflow; GitHub only runs workflows from the default
   branch). Owner setup, once: secret `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`), variable
   `REVIEW_GATE_REVIEWERS=github-actions[bot]`, and "allow GitHub Actions to create and approve pull requests". Then the
   owner runs Actions → Claude Review on #109, picking the model. It reviews the exact head commit and posts the verdict.
2. **What merging deploys.** Merging into `feat/harness-backend` triggers the Vercel production build of the
   `pauli-starnet` project. PR #109 changes no file under `frontend/` or `website/` (the folders that project
   serves), so the served site should not change; confirm in the Vercel dashboard which branch each StarNet project
   (`pauli-starnet`, `starnet-paulis-place-gateway`) treats as production before merging. Vercel built previews of
   Command Center PR #45 on 2026-11-16, so its Git integration answers for that repository; check its production branch
   before merging #45, because a merge to it may release the Command Center.
3. **Merge approval.** One request to Bambú after 1 and 2 are settled, naming both PRs and their head commits. Merge
   order: `executiveusa/pauli-starnet#109`, then `executiveusa/pauli-command-center#45`.
4. **Tests on the merged commit** (record the full list, not just a count):
   - StarNet: run every test in `test/fast.list` one at a time; `npm run test:fast` stops at the first failure.
     Baseline at hand-off: **755 of 758 pass**; the same 3 fail on the untouched base `eb1f24c` (see "Known test
     failures" below). Anything else failing is a regression: stop.
   - Command Center: `npm run verify:acceptance && npm run build`.
5. Never print a secret. Values go only in `/etc/starnet/*.env` and `/etc/paperclip/*.env` (mode 0600).

## Steps (stop and report at the first failure)
1. **Memory check on the chosen box.** Paperclip (~900 MB) + workforce gateway (~600 MB) must fit without pushing
   swap further. If they do not, stop and report; do not stop other services.
2. **A new checkout, never the existing ones.** Clone the merged commit into a new directory (for example
   `/opt/starnet/one-system`) as a non-root user, on the box chosen in step 1. Do not pull, reset, switch branches in, or overwrite the existing
   backend checkouts on .209 or .212; their uncommitted changes stay as they are. A checkout's HEAD is not proof of
   what is running.
3. **Postgres for Paperclip.** A new database and role on the existing self-hosted Postgres on .209, or a dedicated
   Postgres container. No embedded Postgres, no root.
4. **Paperclip.** Install the pinned version as user `paperclip` with `deploy/one-system/paperclip.service`, using the
   external database. One company for the organization. A Paperclip agent for each name printed by
   `node scripts/one-system/roles-template.mjs`, each with its own API key. Register only the Found First crew.
5. **Roles file.** `/etc/starnet/factory-roles.json` (root-owned, 0600), passing
   `node scripts/one-system/roles-template.mjs --check /etc/starnet/factory-roles.json`.
6. **Models.** Default `deepseek/deepseek-v4.1-flash-1017` with OpenRouter fallbacks. The subscription review lane is
   not wired (no CLI executor), so mission review runs use DeepSeek and say so on the receipt; that is metered spend,
   approved by the owner on 2026-11-16 ("we just need this to work right now").
   Optional: a free key (Groq, Gemini or Mistral) for test and light work, then `node scripts/models/free-pool.js`.
7. **Workforce gateway.** `/etc/starnet/workforce.env` from `deploy/one-system/env.example`, with
   `STANDING_AUTOMATION=approved` (the default: a standing job runs only after the owner approves it on the phone,
   then on its schedule until stopped; `off` stops them all). Install `deploy/one-system/starnet-workforce.service` pointing at the new checkout;
   start it. Do not enable `deploy/systemd/starnet-foreman.timer`.
8. **City gateway.** `FACTORY_BASE_URL=http://127.0.0.1:4000` and `FACTORY_OWNER_TOKEN` so `/v1/districts` serves the
   Paperclip board. If the city gateway runs from an existing checkout, change only its environment and ask first.
9. **HTTPS on thepaulieffect.com.** `hq.` (city gateway) and `factory.` (workforce gateway) per
   `deploy/one-system/Caddyfile.example`. Paperclip stays private.
10. **Command Center on Vercel (owner decision 2026-11-16).** The phone app is the Vercel frontend; it reaches StarNet
    over HTTPS at `factory.thepaulieffect.com` and refreshes every 10 seconds. In the Vercel project set
    `STARNET_FACTORY_URL=https://factory.thepaulieffect.com`, `STARNET_FACTORY_TOKEN` (the workforce bearer) and
    `STARNET_OWNER_APPROVAL_TOKEN` (the same value as StarNet's `OWNER_APPROVAL_TOKEN`), production only. The owner
    approval key never goes to Instinct or any agent: Instinct holds the bearer for its heartbeat, and this second key
    is what keeps approvals the owner's. Confirm which branch Vercel releases to production, then release. The production release needs
    Bambú's tap. Nothing on 18979 is needed: the Command Center talks to StarNet, not to a local upstream.
11. **Instinct heartbeat and orders.** `POST /v1/factory/chief/heartbeat` with `{"by":"instinct"}` every minute. The
    reply carries `open_orders`: the owner's orders and "you went direct" notices. Instinct hands each order to
    Heisenberg as missions, then acknowledges it with `POST /v1/factory/chief/orders/<id>/ack` and `{"by":"instinct"}`.
    An order not acknowledged within 15 minutes shows as overdue on the phone, and the sweep logs it once.

## Live tests (record each as PASS, FAIL or NOT_RUN with what was seen)
| # | Test | Pass when |
|---|---|---|
| L1 | `FACTORY_GATEWAY_URL=... FACTORY_OWNER_TOKEN=... node scripts/factory-live-acceptance.mjs` | exits 0; evidence file saved |
| L2 | Walk test on the new checkout: `node scripts/icm/walk.js` | 12/12 districts |
| L3 | `GET /v1/factory/chief` with heartbeats on, then off for 6 minutes | `instinct`, then `heisenberg` |
| L4a | Before any approval, across one scheduled time | no standing missions created in any district |
| L4b | Bambú approves one revenue standing job on the phone (Scheduled jobs → Approve), one weekday | that job's mission appears once, assigned to the named agent; unapproved jobs and other districts schedule nothing; Stop ends it the next period |
| L5 | Start `found-first-launch` for a test subject from the phone | stage 1 assigned to boring-marketer; stops at the owner gate after outreach-draft |
| L6 | Phone: STARNET → Control | acting chief, district board and agents shown; "Tell Instinct" creates an open order Instinct acknowledges; a direct task to one agent becomes a mission and leaves a "you went direct" notice for the chief |
| L7 | A mission needing `publish` | parks; the phone shows the exact permissions; authorizing releases it |
| L8 | Emergency stop from the phone (type STOP), then Resume all | all workers paused, then resumed |
| L9 | Spend check after 24 hours | receipts show lanes and route notes (including any subscription-lane fallback); month-to-date spend under budget |
| L10 | Overnight soak | no duplicate missions, no stuck run without a nudge or escalation |

L5 to L8 need the Command Center released (step 10); until then they are NOT_RUN.

## Known test failures (fail on the untouched base too; fix in their own PRs, not waived)
| Test | Cause (verified in the build session) | Fix |
|---|---|---|
| `crt-context-loss.e2e.test.mjs` | Needs Chrome. With Chromium present and `--no-sandbox` (needed when running as root), it passes in full. | Environment only: run the suite where `SKYNET_CHROME` points to Chrome; as root, a wrapper adding `--no-sandbox`. No code change. |
| `website-app-sync.test.js` | `frontend/app/factory-status.js` was added on the base without `npm run sync:website`; `website/app` lacks it and one line of `index.html`. | Run `npm run sync:website` (2 files). It changes the public web app, so it goes in its own PR with Bambú's OK. |
| `qa-product-perfect-claims.test.js` | (a) The locked release path-set in `qa/product-perfect/claims.json` predates `frontend/app/factory-status.js`. (b) On a shallow clone, `git rev-parse` of the candidate fails. | (a) Re-lock the release ledger with the repository's QA tooling, in its own PR, reviewed. That is a release-authority change, never edited by hand. (b) Run on a full clone. |

## Rollback
Stop `starnet-workforce.service`; unset `FACTORY_BASE_URL` on the city gateway (it returns to its labeled fallback);
unset `STARNET_FACTORY_URL` on the Command Center (the control page shows "Not connected"). Paperclip data stays. The
existing backend checkouts were never touched, so nothing else needs undoing.

## Report back
Box chosen and memory before and after, each step's result, L1 to L10 with evidence, the full test list result, and
anything that needs Bambú.

## Owner decisions, 2026-11-16 (after the review)
1. Reviewer: Claude on the owner's subscription, model chosen per review (PR #110).
2. Mission reviews run on DeepSeek for now (metered).
3. Standing jobs: the owner approves each one; it then runs by itself until stopped.
4. Command Center: Vercel frontend connected to StarNet; the owner normally talks only to Instinct, Instinct to
   Heisenberg, Heisenberg runs the crew, and the chain of command is the backup. Hardened with ideas from
   kunchenguid/firstmate (MIT): one human interface, orders closed by records (acknowledged by id), direct owner input
   to a worker treated as an override and reconciled by the chain, overdue orders flagged once.

## Changes from the first hand-off (2026-11-16 review)
- Subscription review lane marked not wired; it uses `deepseek-default` and records why. The sidecar executor refuses a
  CLI-only lane instead of sending its model id to OpenRouter (finding 1).
- Standing jobs are off by default (`STANDING_AUTOMATION`); district registries, explicit missions and pipelines are
  unchanged. L4 is split into L4a (off) and L4b (revenue only, owner decision) (findings 3, 4).
- Test baseline corrected to 755 of 758, with causes and fixes for the 3 (finding 2).
- Deploy effects of merging, the new-checkout rule, the Command Center deploy path and the reviewer identity are now
  explicit gates (findings 5 to 8).
