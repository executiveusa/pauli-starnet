# City Web Surface — Pauli's Place on the web

Status: v1 on branch `feat/city-web-surface`. Deployed surface renders the canonical city;
live state appears only when a gateway is connected.

## What it is

`frontend/city/` is a static, phone-first web surface for Pauli's Place. It renders the
canonical CityOS manifest — 9 districts, 13 buildings, 44 specialist slots — loaded
directly from `frontend/app/cityos.js` (`CityOS.DEFAULT_SPEC` + `CityOS.BUILDING_TEMPLATES`).
It is not a second city manifest; it is a read-only projection plus a task front door.

## Surfaces

- **City map** — every district and building, every slot either seated from the live
  roster or shown as an honest vacancy. No invented agents, no fake activity.
- **Tasks & receipts** — Commerce District buildings (Commerce Factory, Connector
  Exchange) expose per-slot task intake. Tasks POST to the gateway's
  `POST /v1/heisenberg/tasks` with routing context (`district`, `building`, `slot`,
  `agentId`) and poll `GET /v1/heisenberg/tasks/:id` for status + receipt id.
- **Needs You** — the gateway's approvals list. Read-only on this surface: approvals
  stay on the owner channel.

## Connecting live state

The surface talks to the Pauli gateway (`gateway/server.js`), the authenticated proxy
in front of the loopback StarNet sidecar. Settings (stored in the browser's local
storage only):

- Gateway URL — the HTTPS origin fronting the gateway (Cloudflare Tunnel / Coolify).
- Bearer token — `GATEWAY_BEARER_TOKEN`.

Without a gateway the surface shows the canonical city plan with an explicit
"not connected — no live state" banner. `?demo=1` shows sample seating labeled DEMO.

## Commerce District seed roster

`frontend/city/ecom-roster.json` seeds the five Commerce District specialists into a
running station's `agent.roster.json`:

| Agent | Slot | Building | Job |
| --- | --- | --- | --- |
| MERCI | operator | Commerce Factory | day-to-day ecommerce ops, listing drafts, fulfillment read-backs |
| BEACON | optimizer | Commerce Factory | search/keyword/listing optimization, conversion evidence |
| HERALD | publisher | Commerce Factory | drop calendar, publish-ready packages (never self-publishes) |
| LEDGER | treasurer | Commerce Factory | unit economics, budgets, cost audits from real records |
| CONDUIT | operator | Connector Exchange | connector health checks + provider calls with verbatim read-backs |

All five carry the same hard rule in their system prompts: money, publishing, external
contact, and account mutation wait for explicit owner approval. Seating the roster is a
backend step (import into the running station); the web surface never claims they are
working until the live roster proves it.

## Tests

`test/city-web.test.js` (49 assertions, registered in `test/fast.list`): canonical
counts, roster-vs-spec validity, status classification honesty, seating honesty,
task payload and receipt shapes.

## Deploy

Static — any static host can serve `frontend/` and the surface sits at `/city/`.
For a dedicated site, publish `frontend/city/` with `frontend/app/cityos.js` available
at `../app/cityos.js` (the staged deploy copies it alongside).

## Reproducing the 2026-09-10 deploy

```bash
# stage (repo source of truth: frontend/city + frontend/app/cityos.js)
rm -rf /tmp/city-deploy && mkdir -p /tmp/city-deploy/app
cp frontend/city/{index.html,city.css,city.js,city-core.js,ecom-roster.json} /tmp/city-deploy/
cp frontend/app/cityos.js /tmp/city-deploy/app/
(cd /tmp/city-deploy && zip -qr /tmp/city-deploy.zip .)

# publish to the pauli-starnet-city Netlify site (site id 820f3b2f-63e7-4933-90de-4efdf37cebc5)
curl -H "Authorization: Bearer $NETLIFY_DEPLOY_TOKEN" \
  -H "Content-Type: application/zip" --data-binary @/tmp/city-deploy.zip \
  "https://api.netlify.com/api/v1/sites/820f3b2f-63e7-4933-90de-4efdf37cebc5/deploys"
```

The deploy token lives in the vault as `Netlify deploy token (instinct-city-deploy)`
(created 2026-09-10 in the executiveusa Netlify team, name `instinct-city-deploy`).
Verified after deploy: `/` 200, `/app/cityos.js` 200, desktop + 390px mobile rendering,
no horizontal overflow, demo mode labeled, offline state honest.
