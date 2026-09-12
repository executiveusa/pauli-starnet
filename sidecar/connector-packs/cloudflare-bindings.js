'use strict';
const DESCRIPTOR = Object.freeze({
  id: 'cloudflare-bindings', name: 'Cloudflare Bindings', kind: 'mcp-preset', status: 'descriptor-only',
  transport: 'http', auth: 'oauth', endpoint: 'https://bindings.mcp.cloudflare.com/mcp',
  officialDocs: 'https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/',
  capabilities: Object.freeze(['workers', 'kv', 'r2', 'd1']),
  advertisedTools: Object.freeze([]), installable: false,
  note: 'Use the existing custom HTTP MCP setup. Discover and review the live tool list after OAuth; this descriptor grants nothing.'
});
function descriptor() { return JSON.parse(JSON.stringify(DESCRIPTOR)); }
module.exports = { DESCRIPTOR, descriptor };
