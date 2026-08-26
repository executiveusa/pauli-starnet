# StarNet v0.10.12

- StarNet no longer progressively degrades into a laggy software-rendered station after several minutes or after minimize/restore. The stage and bake watchdogs now sample through a dedicated readback canvas instead of repeatedly reading the visible canvas, avoiding Chromium's software-raster fallback.
- Stage recovery no longer accumulates duplicate window/document listeners after a GPU reset. Global recovery listeners are bound once, while replacement-canvas listeners remain scoped to the canvas they belong to.
- Streaming COMMS replies now coalesce prose rendering to at most once per animation frame, and long transcript DOMs are bounded while preserving the newest messages. Complete markdown, links, bullets, ordering, and close/error flushes are retained.
- Account links can repair themselves after a reinstall when the secure device token survived but the local link record did not. Explicitly unlinked or revoked stations stay unlinked.
- Fresh installs no longer mistake normal shutdown/E-STOP bookkeeping for prior station data, avoiding a false recovery gate after a first open and close.
- Managed-model requests with an invalid or endpointless provider configuration now refuse with the real setup remedy instead of silently routing to the wrong API endpoint.
- Codex/ChatGPT conversations recover from an orphaned tool-result record instead of leaving that chat permanently stuck on a Responses API error.
- Added Higgsfield to the connector catalog with its OAuth sign-in flow, and added OAuth as an authentication option for custom HTTPS MCP servers entered by URL.
- Custom connector OAuth preserves configuration across browser consent and restart, requests provider-advertised scopes, and keeps submitted bearer values out of OAuth connector storage.
- The release train warms its browser proof before the gate begins, removing the startup race that interrupted the automatic 0.10.10 train.

This update includes the complete v0.10.11 change set plus the performance-degradation repair above. It does not claim to reconcile credits purchased under a different web account than the one linked to the station; that account-identity case remains a separate support investigation.

This focused hotfix waives the normal 48-hour RC soak because it repairs a shipped degradation affecting v0.10.10 and v0.10.11. Before publication it still requires the exact installed-desktop smoke, a sustained installed minimize/restore run, full fast/HTTP gates, the signed release train, notarized macOS artifacts, and hosted T0/G1 packaged checks.
