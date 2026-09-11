/* pauli-gateway — /v1/city/world : read-only public world geometry.
   Serves the live workspace's station document (rooms/props/belts) so the public city surface can
   render the REAL 2D world. Whitelisted geometry keys only — no agent documents, no secrets. */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const STATION_KEYS = ['_nid', 'belts', 'edges', 'meta', 'order', 'props', 'rooms', 'schema', 'version'];

function workspacePath() {
  return process.env.STARNET_WORKSPACE_PATH ||
    path.join(os.homedir(), 'AppData', 'Roaming', 'ai.skynet.harness', 'workspaces');
}

function sanitizeStation(st) {
  if (!st || typeof st !== 'object') return null;
  const out = {};
  for (const k of STATION_KEYS) if (st[k] !== undefined) out[k] = st[k];
  if (!out.rooms || typeof out.rooms !== 'object') return null;   // rooms is the WorldModel's keyed room map
  return out;
}

function getCityWorld(opts) {
  const wsPath = (opts && opts.workspacePath) || workspacePath();
  const saveFile = path.join(wsPath, 'agent.save.json');
  let doc = null;
  try {
    if (fs.existsSync(saveFile)) doc = JSON.parse(fs.readFileSync(saveFile, 'utf8'));
  } catch (e) {
    return { ok: false, error: 'WORLD_UNREADABLE', message: e.message, generatedAt: new Date().toISOString() };
  }
  const station = sanitizeStation(doc && doc.station);
  if (!station) {
    return { ok: true, station: null, reason: 'NO_STATION_COMPILED', generatedAt: new Date().toISOString() };
  }
  return { ok: true, station, generatedAt: new Date().toISOString() };
}

module.exports = { getCityWorld, sanitizeStation, STATION_KEYS };
