# THP Commercial | Agent Entry
Status: BUILDING · owner-facing interface is one agent · no live customer intake authorized.
Start here; next read `nodes/dispatch/CONTRACT.md` and `state/STATUS.json`. Do not search unrelated StarNet city folders.

## Human contract
- THP is a Northwest Washington father-and-son commercial flooring contractor serving Washington and Arizona (geography requires final owner verification).
- The owner sends ordinary WhatsApp messages. The agent responds in plain language with the result or **one precise approval request**. Never refer them to a dashboard or CRM to manage routine work.
- The single entry agent can be Instinct, Hermes or Pi. Model/provider is replaceable; business state and tool permissions are not.
- THP website remains a lead entry only. Its marketing site must not contain multi-client factory controls.
- Starnet runs orchestration/capability routing, not a database of real customer PII in public GitHub. Real knowledge is approved business facts only; customer bids belong in tenant-private Postgres/Storage.
- SMS, WhatsApp, iMessage/Apple Messages, telephone AI, scheduling, uploads, and customer replies are **adapters**, not features to promise until tested. Current StarNet built-in channel list does not establish official WhatsApp or iMessage delivery.
- No automatic quoting, project acceptance, price changes, outreach, deletion or spend. Human approval required.
- Shared botanic-creations THP schema is legacy research; the dedicated Supabase project creation is blocked by the account's active-free-project quota. No live dispatch.

## Authoritative paths
`config/tenant.json` business configuration and safe channels; `nodes/dispatch/CONTRACT.md` agent routing; `state/STATUS.json` current operational state; `knowledge/FACTS.md` verified/pending claims; `tests/walk.test.cjs` cold-start contract verifier.
Reusable protocol is in `docs/SINGLE_AGENT_SERVICE_PROTOCOL.md`, separate from THP's company content.

## One-message operating pattern
Owner: "Any new bids?" -> authenticate channel binding -> read only authorized lead summary -> reply with 1–3 useful items or "not connected" and exact next action.
Owner: "Follow up on the hospital job" -> resolve job -> draft action -> ask approval -> record authorization -> send only via approved provider -> return provider/delivery receipt.
Owner: "What's due tomorrow?" -> read private deadlines -> plain reply; never guess from chat history.
