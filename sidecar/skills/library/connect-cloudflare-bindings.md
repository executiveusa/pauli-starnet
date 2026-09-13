---
name: Connect Cloudflare Bindings
slug: connect-cloudflare-bindings
description: Set up Cloudflare's official Bindings MCP through StarNet's existing custom HTTP MCP path and verify the live tool list before use.
category: Connectors
requires: [connector]
license: MIT
default: false
---

This is a setup and verification guide, not a built-in connector. It grants no Cloudflare access and advertises no tools until the live MCP server returns them after OAuth.

## Source
Official documentation: https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/
Endpoint: `https://bindings.mcp.cloudflare.com/mcp`

## Method
1. Confirm the intended Cloudflare account and task. Do not infer authority from the account being available.
2. Add a custom HTTP MCP connector using the exact endpoint above and OAuth. Never paste tokens into a config file or task text.
3. Complete Cloudflare's own sign-in and consent screen. Review the requested account and scopes before approval.
4. Reconnect and read the tool list returned by the server. Treat those live schemas as the capability source of truth; this skill does not promise Workers, KV, R2, or D1 operations merely because they are product families.
5. Make one read-only call relevant to the task and compare it with Cloudflare's dashboard. A successful connection alone is not proof the right account or resources are visible.
6. Keep writes, deploys, DNS changes, storage mutations, and spend behind their normal approval and verification gates.

## Output
Report the connector ID, account identity shown by Cloudflare, scopes approved, live tools discovered, the read-only verification performed, and anything still unproven. Never report secret values.
