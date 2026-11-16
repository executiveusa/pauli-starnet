# 08_activation — turning it on (for Instinct, with Bambú's approvals)

Everything in this program is built and tested in the repository against Paperclip's documented API. Nothing has run
against the live servers yet. This file is the ordered list to make it live, and the tests that prove it.
Server facts from Instinct's 2026-11-16 census: two 2 CPU / 8 GB boxes; .209 (prod-city-1) is the persistent lane
with swap nearly full; .212 is legacy. Decide placement by measured free memory, not by this file.

## Before anything
- Merge order: executiveusa/pauli-starnet PR "one-system" first, then executiveusa/pauli-command-center
  PR "Phone control of StarNet's workforce". Both need Bambú's review.
- Run on a checkout of the merged commit: `npm run test:fast` (StarNet) and `npm run verify:acceptance && npm run build`
  (Command Center). Record the results.
- Never print a secret. Values go in `/etc/starnet/*.env` and `/etc/paperclip/*.env` (mode 0600), never in git.

## Steps (stop and report at the first failure)
1. **Memory check on the chosen box.** Paperclip (~900 MB) + workforce gateway (~600 MB) must fit without pushing swap
   further. If they do not, stop and report; do not kill other services.
2. **Postgres for Paperclip.** Use the existing self-hosted Supabase Postgres on .209 (a new database and role just for
   Paperclip) or a dedicated Postgres container. No embedded Postgres, no root.
3. **Paperclip.** Install the pinned version as user `paperclip` with `deploy/one-system/paperclip.service`; set its
   external database setting from its docs. Create one company for the organization. Create a Paperclip agent for each
   name printed by `node scripts/one-system/roles-template.mjs`, each with its own API key.
4. **Roles file.** Save the filled template as `/etc/starnet/factory-roles.json` (root-owned, 0600). It must pass
   `node scripts/one-system/roles-template.mjs --check /etc/starnet/factory-roles.json`.
5. **Model id.** Find the exact OpenRouter id of the owner's DeepSeek model in the live catalog; write it into
   `registry/models.json` (`lanes.deepseek-default.model`) in a small PR. Until then runs use each executor's model.
6. **Workforce gateway.** `/etc/starnet/workforce.env` from `deploy/one-system/env.example`; install
   `deploy/one-system/starnet-workforce.service`; start it. Do not enable `deploy/systemd/starnet-foreman.timer`
   (the GitHub-label queue is superseded).
7. **City gateway.** Set `FACTORY_BASE_URL=http://127.0.0.1:4000` and `FACTORY_OWNER_TOKEN` (the workforce bearer) so
   `/v1/districts` serves the Paperclip board.
8. **HTTPS on thepaulieffect.com.** `hq.` (city gateway) and `factory.` (workforce gateway) per
   `deploy/one-system/Caddyfile.example`. Paperclip stays private (loopback and the tailnet).
9. **Command Center.** In its deployment set `STARNET_FACTORY_URL=https://factory.thepaulieffect.com` and
   `STARNET_FACTORY_TOKEN` (the workforce bearer). Redeploy.
10. **Instinct heartbeat.** Instinct calls `POST /v1/factory/chief/heartbeat` with `{"by":"instinct"}` every minute.

## Live tests (record each as PASS, FAIL or NOT_RUN with what was seen)
| # | Test | Pass when |
|---|---|---|
| L1 | `FACTORY_GATEWAY_URL=... FACTORY_OWNER_TOKEN=... node scripts/factory-live-acceptance.mjs` | exits 0; evidence file saved |
| L2 | Walk test on the server checkout: `node scripts/icm/walk.js` | 12/12 districts |
| L3 | `GET /v1/factory/chief` with heartbeats on, then off for 6 minutes | `instinct`, then `heisenberg` |
| L4 | One weekday: standing jobs | revenue missions appear once each, assigned to the named agents; nothing repeats |
| L5 | Start `found-first-launch` for a test subject from the phone | stage 1 assigned to boring-marketer; stops at the owner gate after outreach-draft |
| L6 | Phone: STARNET → Control | acting chief, district board and agents shown; a direct task to one agent becomes a mission |
| L7 | A mission needing `publish` | parks; the phone shows the exact permissions; authorizing releases it |
| L8 | Emergency stop from the phone (type STOP), then Resume all | all workers paused, then resumed |
| L9 | Spend check after 24 hours | receipts show lanes; month-to-date spend under budget |
| L10 | Overnight soak | no duplicate missions, no stuck run without a nudge or escalation |

## Rollback
Stop `starnet-workforce.service`; unset `FACTORY_BASE_URL` on the city gateway (it returns to its labeled fallback);
unset `STARNET_FACTORY_URL` on the Command Center (the control page shows "Not connected"). Paperclip data stays.

## Report back
Box chosen and memory before/after, each step's result, L1 to L10 with evidence, and anything that needs Bambú.
