# 08_activation — turning it on (for Instinct, with Bambú's approvals)

Everything here is built and tested in the repository. Nothing has run against the live servers. This file is the
ordered list to make it live, the tests that prove it, and the rollback. Corrected 2026-11-16 after Instinct's
activation review (findings 1 to 8); what changed is listed at the end.
Server facts from Instinct's census: two 2 CPU / 8 GB boxes; .209 (prod-city-1) runs the active backend from
`feat/jmo-skills-picks-clean`; .212 runs `feat/harness-backend`. Both checkouts have uncommitted runtime changes.

## Before anything (owner decisions and gates)
1. **Reviewer.** A GitHub account that did not build this work (not `executiveusa`, not an unrelated account such as
   Stash) is set in the repository variable `REVIEW_GATE_REVIEWERS`. A person creates that account. It reviews PR #109
   and approves its latest commit. Changing that variable is an owner action.
2. **What merging #109 deploys.** Merging into `feat/harness-backend` triggers the Vercel production build of the
   `pauli-starnet` project. PR #109 changes no file under `frontend/` or `website/` (the folders that project
   serves), so the served site should not change; confirm in the Vercel dashboard which branch each StarNet project
   (`pauli-starnet`, `starnet-paulis-place-gateway`) treats as production before merging.
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
   `/opt/starnet/one-system`) as a non-root user. Do not pull, reset, switch branches in, or overwrite the existing
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
   not wired (no CLI executor), so review runs use DeepSeek and say so on the receipt; that is metered spend.
   Optional: a free key (Groq, Gemini or Mistral) for test and light work, then `node scripts/models/free-pool.js`.
7. **Workforce gateway.** `/etc/starnet/workforce.env` from `deploy/one-system/env.example`, with
   `STANDING_AUTOMATION=off`. Install `deploy/one-system/starnet-workforce.service` pointing at the new checkout;
   start it. Do not enable `deploy/systemd/starnet-foreman.timer`.
8. **City gateway.** `FACTORY_BASE_URL=http://127.0.0.1:4000` and `FACTORY_OWNER_TOKEN` so `/v1/districts` serves the
   Paperclip board. If the city gateway runs from an existing checkout, change only its environment and ask first.
9. **HTTPS on thepaulieffect.com.** `hq.` (city gateway) and `factory.` (workforce gateway) per
   `deploy/one-system/Caddyfile.example`. Paperclip stays private.
10. **Command Center.** No automatic deploy path was found (Vercel Git disconnected, no webhooks, build-only
    workflows, runners inactive, nothing listening on 18979). Choose and approve a deploy path first; then set
    `STARNET_FACTORY_URL=https://factory.thepaulieffect.com` and `STARNET_FACTORY_TOKEN`, and redeploy. A production
    redeploy needs Bambú's tap.
11. **Instinct heartbeat.** `POST /v1/factory/chief/heartbeat` with `{"by":"instinct"}` every minute.

## Live tests (record each as PASS, FAIL or NOT_RUN with what was seen)
| # | Test | Pass when |
|---|---|---|
| L1 | `FACTORY_GATEWAY_URL=... FACTORY_OWNER_TOKEN=... node scripts/factory-live-acceptance.mjs` | exits 0; evidence file saved |
| L2 | Walk test on the new checkout: `node scripts/icm/walk.js` | 12/12 districts |
| L3 | `GET /v1/factory/chief` with heartbeats on, then off for 6 minutes | `instinct`, then `heisenberg` |
| L4a | Standing jobs while `STANDING_AUTOMATION=off` (the default), across one scheduled time | no standing missions created in any district |
| L4b | Only if Bambú approves revenue-only automation: set `STANDING_AUTOMATION=revenue` for one weekday | revenue standing missions appear once each, assigned to the named agents; no other district schedules anything; nothing repeats. Otherwise NOT_RUN |
| L5 | Start `found-first-launch` for a test subject from the phone | stage 1 assigned to boring-marketer; stops at the owner gate after outreach-draft |
| L6 | Phone: STARNET → Control | acting chief, district board and agents shown; a direct task to one agent becomes a mission |
| L7 | A mission needing `publish` | parks; the phone shows the exact permissions; authorizing releases it |
| L8 | Emergency stop from the phone (type STOP), then Resume all | all workers paused, then resumed |
| L9 | Spend check after 24 hours | receipts show lanes and route notes (including any subscription-lane fallback); month-to-date spend under budget |
| L10 | Overnight soak | no duplicate missions, no stuck run without a nudge or escalation |

L5 to L8 need the Command Center deployed (step 10); without an approved deploy path they are NOT_RUN.

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

## Changes from the first hand-off (2026-11-16 review)
- Subscription review lane marked not wired; it uses `deepseek-default` and records why. The sidecar executor refuses a
  CLI-only lane instead of sending its model id to OpenRouter (finding 1).
- Standing jobs are off by default (`STANDING_AUTOMATION`); district registries, explicit missions and pipelines are
  unchanged. L4 is split into L4a (off) and L4b (revenue only, owner decision) (findings 3, 4).
- Test baseline corrected to 755 of 758, with causes and fixes for the 3 (finding 2).
- Deploy effects of merging, the new-checkout rule, the Command Center deploy path and the reviewer identity are now
  explicit gates (findings 5 to 8).
