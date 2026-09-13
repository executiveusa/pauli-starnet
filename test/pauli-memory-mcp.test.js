/* pauli-memory MCP exposure (chunk 7, OpenChronicle port) — headless proof: the pure core speaks
   MCP (initialize negotiates protocol + carries the call-first instructions; tools/list exposes
   the 4 read-only tools; tools/call routes, drills down by id, flags unknown tools); and the
   stdio edge proves SEPARATE-PROCESS exposure: a spawned pauli-memory-serve.js answers JSON-RPC
   over pipes with the memory it was given. Read-only throughout - no write tools exist. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { makePauliMemory } = require('../sidecar/pauli-memory.js');
const { LATEST_PROTOCOL, SERVER_INFO, INSTRUCTIONS, TOOLS, makeMemoryBridge } = require('../sidecar/mcp/pauli-memory-core.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-memory-mcp-test-'));
let now = 90000;
const clock = () => now;
const mkMem = r => makePauliMemory({ fs, pathMod: path, root: r || root, clock, crypto });

const mem = mkMem();
mem.capture({ kind: 'observation', summary: 'owner asked about the council' });
mem.note({ fact: 'the city has 11 districts', source: 'cityos spec', tags: ['city'] });
mem.teach({ name: 'ship-a-chunk', steps: ['write', 'prove', 'patch'], source: 'repo law' });

const bridge = makeMemoryBridge({ memory: mem });

// initialize: protocol negotiation + the call-first instructions
const init = bridge.handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } });
A.eq(init.result.protocolVersion, '2024-11-05', "client's known revision is echoed");
A.eq(init.result.serverInfo, SERVER_INFO, 'server info returned');
A.ok(init.result.instructions.includes('CALL THESE TOOLS FIRST'), 'instructions teach call-first (OpenChronicle pattern)');
A.ok(init.result.instructions.includes('READ-ONLY'), 'instructions declare the surface read-only');
const initDefault = makeMemoryBridge({ memory: mem }).handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
A.eq(initDefault.result.protocolVersion, LATEST_PROTOCOL, 'unknown revision falls back to latest known');

// tools/list: the read-only surface
const listed = bridge.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
A.eq(listed.result.tools.map(t => t.name), ['pauli_memory_stats', 'pauli_memory_recall', 'pauli_memory_recent', 'pauli_memory_read'], 'four read-only tools');
A.ok(!listed.result.tools.some(t => /capture|note|teach|write|delete/i.test(t.name)), 'no write tools exposed');

// tools/call through the RPC edge
function call(name, args) {
  const resp = bridge.handleRpc({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name, arguments: args || {} } });
  return { envelope: resp, body: JSON.parse(resp.result.content[0].text) };
}
A.eq(call('pauli_memory_stats').body, { episodic: 1, semantic: 1, procedural: 1 }, 'stats through the wire');
const recalled = call('pauli_memory_recall', { text: 'districts' }).body;
A.eq(recalled.entries[0].fact, 'the city has 11 districts', 'recall through the wire');
A.ok(recalled.entries[0].provenance.source, 'provenance rides the wire');
A.eq(call('pauli_memory_recent').body.entries[0].summary, 'owner asked about the council', 'recent is the raw episodic layer');
const drill = call('pauli_memory_read', { tier: 'semantic', id: recalled.entries[0].id }).body;
A.eq(drill.entry.fact, 'the city has 11 districts', 'id drill-down returns the entry verbatim');
A.eq(call('pauli_memory_read', { tier: 'semantic', id: 'nope' }).body.ok, false, 'unknown id is a clean miss');
A.eq(call('pauli_memory_read', { tier: 'procedural', id: mem.recall({ tier: 'procedural' }).entries[0].id }).body.entry.name, 'ship-a-chunk', 'procedural drill-down');
const unknown = call('pauli_memory_bogus');
A.eq(unknown.envelope.result.isError, true, 'unknown tool flagged isError');
A.eq(bridge.handleRpc({ jsonrpc: '2.0', id: 3, method: 'notifications/initialized' }), null, 'notifications answered with silence');
A.eq(bridge.handleRpc({ jsonrpc: '2.0', id: 4, method: 'resources/list' }).error.code, -32601, 'unknown method is -32601');

// SEPARATE-PROCESS proof: spawn the stdio edge against its own memory root
const procRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-memory-serve-test-'));
mkMem(procRoot).note({ fact: 'separate process fact', source: 'spawn test' });
const child = spawn(process.execPath, [path.join(__dirname, '..', 'sidecar', 'mcp', 'pauli-memory-serve.js'), procRoot], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
child.stdout.on('data', d => { buf += d.toString(); });
const responses = {};
function pump() {
  const lines = buf.split('\n'); buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try { const msg = JSON.parse(line); if (msg.id !== undefined) responses[msg.id] = msg; } catch (_) {}
  }
}
function send(msg) { child.stdin.write(JSON.stringify(msg) + '\n'); }
function waitFor(id, cb, tries) {
  pump();
  if (responses[id]) return cb(null, responses[id]);
  if ((tries || 0) > 100) return cb(new Error('timeout waiting for id ' + id));
  setTimeout(() => waitFor(id, cb, (tries || 0) + 1), 20);
}
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
waitFor(1, (e1, r1) => {
  A.ok(!e1, 'separate process answers initialize');
  A.eq(r1.result.serverInfo.name, 'pauli-memory', 'separate process is the memory server');
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'pauli_memory_recall', arguments: { text: 'separate process' } } });
  waitFor(2, (e2, r2) => {
    A.ok(!e2, 'separate process answers tools/call');
    const body = JSON.parse(r2.result.content[0].text);
    A.eq(body.entries[0].fact, 'separate process fact', 'separate process reads its own memory root');
    child.kill();
    A.report();
  });
});
