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
// activeTasks must survive classifyStatus - updateActivity merges them into movement;
// dropping them froze every token on the live map (caught by live pixel verification).
{
  const cs = CityCore.classifyStatus({ health: { status: 'online' }, citizens: [], activeTasks: [{ id: 't1', status: 'running', task: 'probe', context: { district: 'commerce', building: 'commerce_factory', slot: 'operator', agentId: 'ecom-merci' } }] });
  A.eq(cs.activeTasks.length, 1, 'classifyStatus carries activeTasks through');
  const model2 = CityCore.cityModel(CityOS);
  const layout2 = CityCore.layoutCity(model2);
  const seating2 = CityCore.seatCitizens(model2, [{ agentId: 'ecom-merci', name: 'MERCI', role: 'operator', district: 'commerce' }]);
  const act2 = CityCore.deriveActivity({ missions: [].concat(cs.activeTasks), tasks: [] });
  const pl2 = CityCore.agentPlacements(model2, layout2, seating2, act2);
  const merci = pl2.find(p => p.agentId === 'ecom-merci');
  A.ok(merci && merci.working === true, 'a running gateway activeTask marks its agent working (end-to-end through classifyStatus)');
}

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

// --- district-aware seating: roster district evidence beats first-match order ---
const dseat = CityCore.seatCitizens(model, [
  { id: 'ecom-ledger', name: 'LEDGER', role: 'treasurer', district: 'commerce', status: 'online' },
  { id: 'econ', name: 'Econ', role: 'treasurer', status: 'online' }
]);
A.eq(dseat.seating['commerce/commerce_factory/treasurer'].id, 'ecom-ledger', 'district-carrying citizen seats in its rostered district');
A.eq(dseat.seating['revenue/revenue_center/treasurer'].id, 'econ', 'district-less citizen takes first open matching slot');

// --- live map: layout, placement, movement honesty ---
const layout = CityCore.layoutCity(model);
A.eq(layout.districts.length, 9, 'map lays out all 9 canonical districts');
const mapBuildings = layout.districts.reduce((n, d) => n + d.buildings.length, 0);
A.eq(mapBuildings, 13, 'map lays out all 13 canonical buildings');
const keys = new Set();
let inside = true;
for (const d of layout.districts) for (const b of d.buildings) {
  if (keys.has(b.key)) inside = false;
  keys.add(b.key);
  if (b.x < 0 || b.y < 0 || b.x + b.w > layout.width || b.y + b.h > layout.height) inside = false;
}
A.ok(inside && keys.size === 13, 'building blocks unique and inside the viewBox');

const seat2 = CityCore.seatCitizens(model, [
  { id: 'ecom-beacon', name: 'BEACON', role: 'optimizer', status: 'online' },
  { id: 'agent', name: 'HEISENBERG', role: 'orchestrator', status: 'online' }
]);
const noAct = CityCore.deriveActivity({ tasks: [], missions: [] });
const placed0 = CityCore.agentPlacements(model, layout, seat2, noAct);
A.eq(placed0.length, 2, 'both roster citizens placed');
const beacon0 = placed0.find(p => p.agentId === 'ecom-beacon');
A.ok(beacon0 && beacon0.seated && !beacon0.working, 'seated citizen starts idle at desk');
const hq = layout.districts.find(d => d.id === 'command').buildings[0];
const heis0 = placed0.find(p => p.agentId === 'agent');
A.eq([heis0.x, heis0.y], [hq.slotPoints.orchestrator.x, hq.slotPoints.orchestrator.y], 'orchestrator sits at HEISENBERG HQ desk');

const running = CityCore.deriveActivity({ tasks: [
  { id: 't1', status: 'running', task: 'research keywords', context: { district: 'commerce', building: 'commerce_factory', slot: 'optimizer', agentId: 'ecom-beacon' } },
  { id: 't2', status: 'completed', task: 'old', context: { district: 'commerce', building: 'commerce_factory', slot: 'treasurer', agentId: 'nobody' } }
], missions: [] });
A.ok(running.byAgent['ecom-beacon'], 'running task registers activity for its routed agent');
A.ok(!running.byAgent['nobody'], 'completed task creates no activity');
const placed1 = CityCore.agentPlacements(model, layout, seat2, running);
const beacon1 = placed1.find(p => p.agentId === 'ecom-beacon');
const cf = layout.districts.find(d => d.id === 'commerce').buildings.find(b => b.templateId === 'commerce_factory');
A.ok(beacon1.working, 'routed running task marks agent working');
A.eq([beacon1.x, beacon1.y], [cf.workPoint.x, cf.workPoint.y], 'working agent stands at the task building work point');
A.eq(CityCore.diffPlacements(placed0, placed1), ['ecom-beacon'], 'exactly one agent moved');
A.eq(CityCore.diffPlacements(placed1, placed1).length, 0, 'stable state has no movement');

const placed2 = CityCore.agentPlacements(model, layout, seat2, noAct);
A.eq(CityCore.diffPlacements(placed1, placed2), ['ecom-beacon'], 'settled task returns agent to desk');

const un = CityCore.agentPlacements(model, layout, CityCore.seatCitizens(model, [
  { id: 'mystery', name: 'Mystery', role: 'wizard', status: 'online' }
]), noAct);
A.ok(un[0] && !un[0].seated, 'unmatched roster citizen is placed unseated');
A.ok(un[0].y >= layout.plaza.y && un[0].y <= layout.plaza.y + layout.plaza.h, 'unseated citizen stands in the plaza');

const junk = CityCore.deriveActivity({ tasks: [null, { status: 'running' }], missions: ['x', { status: 'running' }] });
A.eq(junk.entries.length, 0, 'unrouted or malformed activity is dropped, never guessed');

A.report();

A.report();
