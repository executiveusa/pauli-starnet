'use strict';

const path = require('path');
const { fork } = require('child_process');

const externalPort = parseInt(process.env.GATEWAY_PORT || '4000', 10);
const legacyPort = parseInt(process.env.GATEWAY_LEGACY_PORT || String(externalPort + 1), 10);

// Keep the already-proven gateway implementation untouched behind loopback.
// The workforce facade owns the public port and proxies every non-workforce route.
const child = fork(path.join(__dirname, 'server.js'), [], {
  env: Object.assign({}, process.env, {
    GATEWAY_PORT: String(legacyPort),
    GATEWAY_HOST: '127.0.0.1'
  }),
  stdio: 'inherit'
});

process.env.GATEWAY_PORT = String(externalPort);
process.env.GATEWAY_LEGACY_PORT = String(legacyPort);
require('./workforce-server.js');

function shutdown(signal) {
  if (child && !child.killed) {
    try { child.kill(signal || 'SIGTERM'); } catch (_) {}
  }
}

child.on('exit', (code, signal) => {
  if (code && code !== 0) process.stderr.write('[GATEWAY] legacy child exited code=' + code + ' signal=' + (signal || '') + '\n');
});
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
