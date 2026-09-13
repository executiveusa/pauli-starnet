/* sidecar/mcp/pauli-memory-serve.js — separate-process stdio edge for Pauli's memory MCP server.

   Usage: node sidecar/mcp/pauli-memory-serve.js <memory-root>
   Speaks newline-framed JSON-RPC 2.0 on stdin/stdout (the MCP stdio shape): one JSON message per
   line in, zero or one response per line out. All logic lives in pauli-memory-core.js; this file
   only wires real ambient dependencies (fs, path, clock, crypto) to the memory + the bridge. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { makePauliMemory } = require('../pauli-memory.js');
const { makeMemoryBridge } = require('./pauli-memory-core.js');

const root = process.argv[2];
if (!root) { console.error('usage: node pauli-memory-serve.js <memory-root>'); process.exit(2); }

const memory = makePauliMemory({ fs, pathMod: path, root, clock: () => Date.now(), crypto });
const bridge = makeMemoryBridge({ memory });

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try { msg = JSON.parse(trimmed); } catch (_) { return; } // unparseable lines are dropped, never crash
  let resp;
  try { resp = bridge.handleRpc(msg); } catch (_) { return; }
  if (resp) process.stdout.write(JSON.stringify(resp) + '\n');
});
