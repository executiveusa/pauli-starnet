/* sidecar/mcp/pauli-memory-core.js — the PURE core of Pauli's memory MCP server (chunk 7).

   Port of executiveusa/pauli-OpenChronicle's read-only in-daemon MCP server (MIT, upstream
   Einsia/OpenChronicle @ d780c62d - docs/mcp.md: a stable memory surface any MCP client can
   attach to, with server instructions that teach the client this is personal memory, CALL FIRST).
   See districts/pauli/imports/openchronicle/IMPORT.md.

   READ-ONLY, like OpenChronicle's: external clients can inspect Pauli's memory, never write it.
   Writes stay inside the city (capture/note/consolidate/teach are sidecar-internal).

   TWO LAYERS, OpenChronicle's shape mapped to pauli-memory's three tiers:
   - the durable distilled layer: SEMANTIC facts (with provenance) + PROCEDURAL know-how
   - the raw layer: EPISODIC captures - what literally happened
   The drill-down breadcrumb is pauli_memory_read(tier, id): recall results carry entry ids, and
   read fetches one entry verbatim.

   PURE: the memory instance is INJECTED; no fs, no clock, no network, no Date.now. The separate-
   process stdio edge lives in pauli-memory-serve.js; this file is unit-testable with a stub.

   makeMemoryBridge({ memory }) -> { handleRpc(msg), callTool(name, args) }
     handleRpc: initialize / notifications/initialized / tools/list / tools/call (JSON-RPC 2.0)
     tools: pauli_memory_stats | pauli_memory_recall | pauli_memory_recent | pauli_memory_read */
'use strict';

const LATEST_PROTOCOL = '2025-06-18';
const SERVER_INFO = { name: 'pauli-memory', version: '0.1.0' };
const INSTRUCTIONS =
  'Pauli\'s memory for the city - what happened (episodic), what is known (semantic, with ' +
  'provenance), and how things are done (procedural). CALL THESE TOOLS FIRST when answering about ' +
  'the city\'s knowledge, past work, decisions, or procedures - prefer this memory over "I don\'t ' +
  'know". pauli_memory_stats is the first-hop orientation; pauli_memory_recall searches by text, ' +
  'tags, or tier; pauli_memory_recent is the raw "what just happened" layer; every recalled entry ' +
  'carries an id - drill into it verbatim with pauli_memory_read(tier, id). Entries older than the ' +
  'memory\'s stale window arrive flagged stale:true - a stale memory beats a lost one, but say it ' +
  'is stale. This surface is READ-ONLY.';
const PROTO_RE = /^\d{4}-\d{2}-\d{2}$/;

const TOOLS = [
  {
    name: 'pauli_memory_stats',
    description: 'First-hop orientation: entry counts per tier (episodic / semantic / procedural).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'pauli_memory_recall',
    description: 'Search memory by text, tags, or tier. Returns entries WITH provenance and stale flags. Tag-only recall is scoped to the semantic tier.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'substring to match' },
        tags: { type: 'array', items: { type: 'string' }, description: 'required tags (semantic tier)' },
        tier: { type: 'string', enum: ['episodic', 'semantic', 'procedural'] },
        limit: { type: 'number', description: 'max entries (default 20)' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'pauli_memory_recent',
    description: 'The raw layer: most recent episodic captures - what literally happened, newest first.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'max entries (default 10)' } },
      additionalProperties: false
    }
  },
  {
    name: 'pauli_memory_read',
    description: 'Drill into one entry verbatim by tier + id (the breadcrumb at the end of every recalled entry).',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', enum: ['episodic', 'semantic', 'procedural'] },
        id: { type: 'string' }
      },
      required: ['tier', 'id'],
      additionalProperties: false
    }
  }
];

function makeMemoryBridge(deps) {
  const memory = deps && deps.memory;
  if (!memory || typeof memory.recall !== 'function' || typeof memory.stats !== 'function') {
    throw new Error('pauli-memory-core: an injected pauli-memory instance is required');
  }
  let negotiated = LATEST_PROTOCOL;

  const str = v => (typeof v === 'string' ? v : '');
  const clampInt = (v, dflt, lo, hi) => {
    const n = Math.floor(Number(v));
    if (!isFinite(n)) return dflt;
    return Math.min(hi, Math.max(lo, n));
  };

  const IMPLS = {
    pauli_memory_stats() { return memory.stats(); },
    pauli_memory_recall(args) {
      const q = {};
      if (typeof args.text === 'string' && args.text.trim()) q.text = args.text;
      if (Array.isArray(args.tags) && args.tags.length) q.tags = args.tags.map(String);
      if (typeof args.tier === 'string' && args.tier) q.tier = args.tier;
      q.limit = clampInt(args.limit, 20, 1, 100);
      return memory.recall(q);
    },
    pauli_memory_recent(args) {
      return memory.recall({ tier: 'episodic', limit: clampInt(args.limit, 10, 1, 50) });
    },
    pauli_memory_read(args) {
      const tier = str(args.tier), id = str(args.id);
      if (!tier || !id) return { ok: false, error: 'tier and id are required' };
      const got = memory.recall({ tier, limit: 100 });
      if (!got.ok) return got;
      const entry = got.entries.find(e => e.id === id);
      return entry ? { ok: true, entry } : { ok: false, error: 'no ' + tier + ' entry with id ' + id };
    }
  };

  function callTool(name, args) {
    const impl = IMPLS[name];
    if (!impl) return { __unknownTool: true, error: 'unknown tool: ' + name };
    try { return impl(args || {}); }
    catch (e) { return { ok: false, error: 'tool "' + name + '" failed: ' + ((e && e.message) || e) }; }
  }

  const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
  const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  function handleRpc(msg) {
    if (!msg || typeof msg !== 'object') return null;
    const method = str(msg.method);
    const isNotification = msg.id === undefined || msg.id === null;
    if (method === 'initialize') {
      const want = str(msg.params && msg.params.protocolVersion);
      negotiated = PROTO_RE.test(want) ? want : LATEST_PROTOCOL;
      return ok(msg.id, {
        protocolVersion: negotiated,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS
      });
    }
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null;
    if (method === 'tools/list') return ok(msg.id, { tools: TOOLS });
    if (method === 'tools/call') {
      const name = str(msg.params && msg.params.name);
      const args = (msg.params && msg.params.arguments) || {};
      const result = callTool(name, args);
      const isError = !!result.__unknownTool;
      if (isError) delete result.__unknownTool;
      return ok(msg.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError });
    }
    if (isNotification) return null;
    return fail(msg.id, -32601, 'method not found: ' + method);
  }

  return { handleRpc, callTool, get protocolVersion() { return negotiated; } };
}

module.exports = { LATEST_PROTOCOL, SERVER_INFO, INSTRUCTIONS, TOOLS, makeMemoryBridge };
