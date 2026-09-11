/* /v1/city/world — read-only world geometry route backing. Locks: whitelisted station keys only,
   honest NO_STATION_COMPILED when the workspace has no compiled station, unreadable save fails closed. */
'use strict';
const A = require('./_assert.js');
const fs = require('fs'), os = require('os'), path = require('path');
const CW = require('../gateway/city-world.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cityworld-'));

// 1. no save file → honest empty world, not an error page
let w = CW.getCityWorld({ workspacePath: tmp });
A.ok(w.ok, 'missing save still answers ok');
A.eq(w.station, null, 'missing save → no station');
A.eq(w.reason, 'NO_STATION_COMPILED', 'reason names the gap honestly');

// 2. a save with a station → whitelisted geometry only
const station = {
  version: 3, schema: 9, _nid: 44, meta: { name: "PAULI'S PLACE", spawnRoomId: 'r1' },
  rooms: [{ id: 'r1', name: 'HQ', kind: 'bridge', rects: [{ x1: 0, y1: 0, x2: 9, y2: 9 }] }],
  props: [{ id: 'p1', t: 'comms_dish', x: 2, y: 2, agentId: 'agent' }],
  belts: {}, edges: [], order: ['r1'],
  SECRET_SHOULD_NEVER_LEAK: 'x', token: 'SHOULD_NOT_LEAK'
};
fs.writeFileSync(path.join(tmp, 'agent.save.json'), JSON.stringify({ v: 1, agent: { id: 'agent' }, station }));
w = CW.getCityWorld({ workspacePath: tmp });
A.ok(w.ok && w.station, 'station served when compiled');
A.eq(w.station.rooms.length, 1, 'rooms pass through');
A.eq(w.station.props[0].t, 'comms_dish', 'props pass through');
A.eq(w.station.SECRET_SHOULD_NEVER_LEAK, undefined, 'unknown top-level keys stripped');
A.eq(w.station.token, undefined, 'token-ish keys stripped');
A.eq(w.station.meta.name, "PAULI'S PLACE", 'meta name passes through');
for (const k of CW.STATION_KEYS) delete station[k];
A.ok(true, 'key whitelist is enumerable: ' + CW.STATION_KEYS.join(','));

// 3. corrupt save → fails closed with an explicit error
fs.writeFileSync(path.join(tmp, 'agent.save.json'), '{not json');
w = CW.getCityWorld({ workspacePath: tmp });
A.eq(w.ok, false, 'corrupt save is not ok');
A.eq(w.error, 'WORLD_UNREADABLE', 'corrupt save names the error');

// 4. save without a station doc → NO_STATION_COMPILED
fs.writeFileSync(path.join(tmp, 'agent.save.json'), JSON.stringify({ v: 1, agent: { id: 'agent' } }));
w = CW.getCityWorld({ workspacePath: tmp });
A.ok(w.ok && w.station === null && w.reason === 'NO_STATION_COMPILED', 'null station stays honest');

A.report();
