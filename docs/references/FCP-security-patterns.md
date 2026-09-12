# Reference: flywheel_connectors (FCP) security patterns

flywheel_connectors (agent-flywheel ecosystem) carries connector-security
patterns worth lifting into StarNet's consent ladder:

- **Secretless egress**: connectors call out without ever holding raw
  credentials; tokens live in the store (for us: Infisical) and are injected
  at the boundary.
- **Capability tokens**: a connector gets a scoped, short-lived capability -
  exactly the shape of Hermes' read / plan / execute scopes on the canary.
- **Signed receipts**: every connector action returns a signed receipt;
  matches our SHA-256 chained audit records.

Status 2026-09-12: design reference only. No code adopted yet. When the
consent ladder is next revised (connector -> MCP -> shell -> browser ->
desktop -> vision), mine FCP for the enforcement shapes above.
