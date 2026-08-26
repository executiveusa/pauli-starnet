# StarNet v0.10.11

- Account links can now repair themselves after a reinstall when the secure device token survived but the local link record did not. Explicitly unlinked or revoked stations stay unlinked.
- Fresh installs no longer mistake normal shutdown/E-STOP bookkeeping for prior station data, avoiding a false recovery gate after a first open and close.
- Managed-model requests with an invalid or endpointless provider configuration now refuse with the real setup remedy instead of silently routing to the wrong API endpoint.
- Codex/ChatGPT conversations recover from an orphaned tool-result record instead of leaving that chat permanently stuck on a Responses API error.
- Added Higgsfield to the connector catalog with its OAuth sign-in flow, and added OAuth as an authentication option for custom HTTPS MCP servers entered by URL.
- Custom connector OAuth preserves configuration across browser consent and restart, requests provider-advertised scopes, and keeps submitted bearer values out of OAuth connector storage.
- The release train now warms its browser proof before the gate begins, removing the startup race that interrupted the automatic 0.10.10 train.

This update does not claim to reconcile credits purchased under a different web account than the one linked to the station; that account-identity case remains a separate support investigation.

This bug-fix update waives the normal 48-hour RC soak because it repairs active account-link, model, conversation, onboarding, and connector failures. The exact installed-desktop smoke, full fast/HTTP gates, signed release train, notarized macOS artifacts, and hosted T0/G1 packaged checks are still required before publication.
