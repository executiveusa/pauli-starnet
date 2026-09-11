/* City web surface — proof the render model, e-commerce roster seed, and client
   core stay truthful against the canonical CityOS manifest.
   Locks: 9 districts / 13 buildings come from cityos.js (not a second manifest);
   roster slots exist canonically; unknown state stays unknown; tasks carry routing. */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const path = require('path');

global.WorldModel = null; global.PropSprites = null; global.Pipeline = null; global.window = {};
const CityOS = require('../frontend/app/cityos.js');
const CityCore = require('../frontend/city/city-core.js');
const Specialties = require('../shared/specialties.js');

// --- canonical model ---
const model = CityCore.cityModel(CityOS);
A.eq(model.counts.districts, 9, 'city model keeps canonical 9 districts');
A.eq(model.counts.buildings, 13, 'city model keeps canonical 13 buildings');
A.eq(model.schema, 'paulis.place.city', 'city model keeps canonical schema id');
A.eq(model.version, 2, 'city model keeps CityOS version 2');

const commerce = model.districts.find(d => d.id === 'commerce');
A.ok(commerce, 'commerce district exists');
A.eq(commerce.buildings.map(b => b.templateId), ['commerce_factory', 'connector_exchange'], 'commerce buildings');
const factory = commerce.buildings[0];
A.eq(factory.slots, ['operator', 'optimizer', 'publisher', 'treasurer'], 'commerce factory slots');
A.eq(commerce.buildings[1].connectorPorts, 4, 'connector exchange ports');

// --- ecom roster seed validity ---
const roster = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'frontend', 'city', 'ecom-roster.json'), 'utf8'));
A.eq(roster.agents.length, 5, 'five commerce specialists seeded');
const ids = new Set(roster.agents.map(a => a.agentId));
A.eq(ids.size, roster.agents.length, 'agent ids unique');
const specIds = new Set(Specialties.BUILTINS.concat(Specialties.ARCHETYPES || []).map(s => s.id));
const slotsByBuilding = {};
for (const d of model.districts) for (const b of d.buildings) slotsByBuilding[b.templateId] = { district: d.id, slots: b.slots };
for (const a of roster.agents) {
  const b = slotsByBuilding[a.building];
  A.ok(!!b, a.agentId + ' building exists canonically');
  A.ok(b && b.district === a.district, a.agentId + ' district matches building');
  A.ok(b && b.slots.indexOf(a.role) >= 0, a.agentId + ' role is a canonical slot of its building');
  A.ok(specIds.has(a.specialtyId), a.agentId + ' specialty exists in shared catalog');
  A.ok(/approval/i.test(a.system), a.agentId + ' system prompt keeps approval gate');
}

// --- status classification honesty ---
A.eq(CityCore.classifyStatus(null).mode, 'offline', 'no payload is offline, never live');
A.eq(CityCore.classifyStatus({}).mode, 'degraded', 'empty payload is not live');
A.eq(CityCore.classifyStatus({ degraded: true }).mode, 'degraded', 'degraded flag honored');
A.eq(CityCore.classifyStatus({ health: { status: 'online' }, citizens: [] }).mode, 'live', 'proven online health is live');
A.eq(CityCore.classifyStatus({ health: { status: 'ok' } }).mode, 'degraded', 'unrecognized health is not upgraded to live');

// --- seating honesty ---
const seat = CityCore.seatCitizens(model, [
  { id: 'x1', name: 'Op', specialtyId: 'operator', status: 'online' },
  { id: 'x2', name: 'Mystery', specialtyId: 'wizard', status: 'online' }
]);
const seatedKeys = Object.keys(seat.seating).filter(k => seat.seating[k]);
A.eq(seatedKeys.length, 1, 'one matching citizen seated once');
A.eq(seat.seating['commerce/commerce_factory/operator'].id, 'x1', 'operator seated in commerce factory');
A.eq(seat.unassigned.length, 1, 'non-matching citizen listed unassigned, never invented into a slot');
const empty = CityCore.seatCitizens(model, []);
A.eq(Object.keys(empty.seating).filter(k => empty.seating[k]).length, 0, 'empty roster means all vacancies');

// --- task payloads + receipts ---
A.throws(() => CityCore.buildTaskPayload({ text: '  ' }), 'blank task refused');
const p = CityCore.buildTaskPayload({ text: ' draft 3 listing titles ', districtId: 'commerce', templateId: 'commerce_factory', slot: 'optimizer', agentId: 'ecom-beacon' });
A.eq(p.task, 'draft 3 listing titles', 'task text trimmed');
A.eq(p.context, { source: 'city-web', district: 'commerce', building: 'commerce_factory', slot: 'optimizer', agentId: 'ecom-beacon' }, 'routing context carried');
const rec = CityCore.normalizeTask({ task_id: 't1', status: 'completed', task: 'x', receipt: { receipt_id: 'r9' } });
A.eq(rec, { id: 't1', status: 'completed', task: 'x', startedAt: null, completedAt: null, receiptId: 'r9', error: null, result: null }, 'receipt normalized');
A.eq(CityCore.normalizeTask(null), null, 'null task record stays null');

A.report();
