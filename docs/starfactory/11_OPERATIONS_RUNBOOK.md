# STARFACTORY-001: Operations runbook (repository side)

Every command below is for the **gateway** (`gateway/workforce-server.js`). Paperclip itself is deployed per
`docs.paperclip.ing`; its deployment is **not performed or verified by this change** (see `12_ACCEPTANCE_AND_HANDOFF.md`).

## Configuration (all by environment; secrets are values you supply, never committed)

| Variable | Purpose |
|---|---|
| `PAPERCLIP_URL`, `PAPERCLIP_TOKEN`, `PAPERCLIP_COMPANY_ID` | The one mission authority and a service credential for Heisenberg. Unset `PAPERCLIP_URL` = factory off, gateway behaves exactly as before. |
| `FACTORY_ROLES` | JSON: agent id per role; each worker may carry its **own** `apiKey` and an `executor` (`sidecar` or `http`, with `idempotent`). `heisenberg`, `pi`, `qa` are required; `hermes` is optional. **`qa.apiKey` is mandatory** and must differ from `PAPERCLIP_TOKEN` and from every other role's key; otherwise the gateway exits at startup with an explicit error (QA never falls back to the service credential). |
| `FACTORY_WORKER_TOKEN` | Bearer Paperclip's `http` adapter presents when waking a worker. Different from the owner token. |
| `GATEWAY_BEARER_TOKEN` | Owner bearer for every other `/v1/factory/*` route (existing gateway setting). |
| `FACTORY_STATE_DIR` | Receipts, checkpoints, stop flag. Back this directory up with the gateway. Default `./.starfactory-state`. |
| `FACTORY_RECONCILE_MS` (60000), `FACTORY_POLL_MS` (3000) | Safety-net reconcile and StarNet projection poll. |

Example `FACTORY_ROLES` (ids and keys are placeholders):

```json
{
  "heisenberg": { "agentId": "<paperclip-agent-id>" },
  "pi":     { "agentId": "<id>", "apiKey": "<pi agent key>", "executor": { "type": "sidecar", "agentId": "pi", "port": 8787, "idempotent": true } },
  "hermes": { "agentId": "<id>", "apiKey": "<hermes agent key>", "executor": { "type": "http", "url": "http://127.0.0.1:<port>/run", "idempotent": false } },
  "qa":     { "agentId": "<id>", "apiKey": "<qa agent key>", "executor": { "type": "sidecar", "agentId": "qa", "port": 8787 } }
}
```

In Paperclip, create each worker with the **`http` adapter** pointing at
`https://<private gateway>/v1/factory/wake/<pi|hermes|qa>` with header `Authorization: Bearer <FACTORY_WORKER_TOKEN>`.
Expose the gateway only over a private route (Tailscale/VPN/authenticated proxy). Never expose the sidecar, the
Paperclip API, or a worker shell publicly.

## Start / stop

```bash
GATEWAY_BEARER_TOKEN=... PAPERCLIP_URL=... node gateway/workforce-server.js    # on start, the bridge recovers interrupted runs
curl -H "Authorization: Bearer $OWNER" -X POST $GW/v1/factory/stop   -d '{"reason":"why"}'   # pause workers, cancel runs, refuse new wakes
curl -H "Authorization: Bearer $OWNER" -X POST $GW/v1/factory/resume
curl -H "Authorization: Bearer $OWNER" -X POST $GW/v1/factory/agents/pi/pause     # or /resume
```

## Owner operations

```bash
curl -H "Authorization: Bearer $OWNER" -X POST $GW/v1/factory/missions -d '{"mission_id":"M-1","user_intent":"...","permissions":["read","repo.edit","pr.create"],"budget_usd":2}'
curl -H "Authorization: Bearer $OWNER" $GW/v1/factory/missions/M-1          # tasks, verdicts, next step, all read from Paperclip
curl -H "Authorization: Bearer $OWNER" -X POST $GW/v1/factory/missions/M-1/authorize -d '{"permissions":["deploy"],"approver":"you"}'   # exact restricted scope only
curl -H "Authorization: Bearer $OWNER" -X POST $GW/v1/factory/missions/M-1/accept    -d '{"approver":"you"}'                          # only after an independent PASS
curl -H "Authorization: Bearer $OWNER" -N $GW/v1/factory/events              # SSE; send Last-Event-ID to replay
```

## Status page

Open `https://<private gateway>/v1/factory/ui`, enter the owner token (kept in that tab's `sessionStorage` only). The page is
static and carries no data; everything shown comes from the authenticated `/v1/factory/events` stream.

## Backup / restore

* Mission data: Paperclip's own backup (`paperclipai db:backup` or your Postgres backup).
* Bridge data: copy `FACTORY_STATE_DIR` while the gateway is stopped. Restoring an old copy is safe: a receipt only
  prevents re-execution, and a stale `running` checkpoint is resolved by `recover()` (resume if idempotent, otherwise
  fail visibly).

## Troubleshooting

| Symptom | Meaning |
|---|---|
| A task sits `todo` and nothing runs | The agent is paused or Paperclip cannot reach the gateway wake URL. Check `/v1/factory/state` (agent shows `blocked: agent is paused`) and the worker token. |
| Task `blocked` with "not safe to resume" | A non-idempotent worker was interrupted. The bridge refused to repeat a possible side effect. Inspect the artifact, then re-queue deliberately. |
| Wake answers 403/409 with `MISSION_NOT_AUTHORIZED`, `NOT_ASSIGNED_TO_WORKER`, `STAGE_WORKER_MISMATCH`, `COMPANY_MISMATCH`, `TASK_NOT_RUNNABLE`, `TASK_IN_FLIGHT` | The bridge refused the wake on purpose; nothing ran. The response `error` says which check failed. `MISSION_NOT_AUTHORIZED` on a restricted mission means the owner has not run `authorize` through the gateway. |
| Gateway exits at start: `FACTORY_ROLES.qa.apiKey ...` | QA has no credential of its own, or it equals the service/another role's key. Issue QA its own Paperclip API key. |
| Everything `blocked: emergency stop` | `POST /v1/factory/resume` after fixing the cause. |
| StarNet panel shows `offline` / `unknown` | The stream is down. That is intentional: no stale data is displayed as live. |

## Rollback

Unset `PAPERCLIP_URL` and restart the gateway: the factory routes disappear and `/v1/workforce/missions` returns to
the previous in-memory behaviour. Revert the PR to remove the code. The change adds files and three additive edits
(`gateway/workforce-server.js`, `frontend/index.html`, two test lists); no data is migrated or deleted.
