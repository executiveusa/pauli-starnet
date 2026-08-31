/* Pauli's Place City OS — headless proof of large-chunk city compilation.
   Locks: plan is detached/non-mutating; real WorldModel validators build the draft; one atomic apply; one
   guarded rollback; honest vacancies; real capability furniture; deterministic bounded layout. */
'use strict';
const A = require('./_assert.js');
const WM = require('../frontend/app/worldmodel.js');
const PS = require('../frontend/app/propsprites.js');
global.WorldModel = WM; global.PropSprites = PS; global.Pipeline = require('../frontend/app/pipeline.js'); global.window = {};
const CityOS = require('../frontend/app/cityos.js');

WM.setPropRules(t => { const s = PS.spec(t); return s ? { mount: s.mount || null, stack: !!s.stack, surface: !!s.surface, flat: !!s.flat } : null; });

const roster = [
  { id: 'agent', name: 'Heisenberg', role: 'orchestrator', specialtyId: 'chief' },
  { id: 'tars', name: 'TARS', specialtyId: 'engineer' },
  { id: 'qa', name: 'QA', specialtyId: 'apptester' },
  { id: 'security', name: 'Security', specialtyId: 'auditor' },
  { id: 'reviewer', name: 'Reviewer', specialtyId: 'reviewer' },
  { id: 'opportunity', name: 'Opportunity', specialtyId: 'opportunist' },
  { id: 'research', name: 'Research', specialtyId: 'researcher' },
  { id: 'prospector', name: 'Prospector', specialtyId: 'prospector' },
  { id: 'treasurer', name: 'Treasurer', specialtyId: 'treasurer' },
  { id: 'designer', name: 'Designer', specialtyId: 'designer' },
  { id: 'writer', name: 'Writer', specialtyId: 'writer' },
  { id: 'marketer', name: 'Marketer', specialtyId: 'marketer' },
  { id: 'publisher', name: 'Publisher', specialtyId: 'publisher' },
  { id: 'operator', name: 'Operator', specialtyId: 'operator' },
  { id: 'optimizer', name: 'Optimizer', specialtyId: 'optimizer' },
  { id: 'watcher', name: 'Watcher', specialtyId: 'scout' },
  { id: 'analyst', name: 'Analyst', specialtyId: 'analyst' },
  { id: 'archivist', name: 'Archivist', specialtyId: 'archivist' },
  { id: 'curator', name: 'Curator', specialtyId: 'curator' },
  { id: 'nightwatch', name: 'Nightwatch', specialtyId: 'nightwatch' },
  { id: 'foreman', name: 'Foreman', specialtyId: 'foreman' },
  { id: 'drafter', name: 'Drafter', specialtyId: 'drafter' }
];

const station = WM.create();
A.eq(CityOS.liveStation(), station, 'browser capture seam tracks the real station created by WorldModel');
A.ok(station.ensureWorkstation('agent').ok, 'fresh hero workstation materialized before city planning');
const before = station.serialize(), beforeText = JSON.stringify(before);

const plan = CityOS.plan(station, null, { roster });
A.ok(plan.ok, 'default Pauli\'s Place plan compiles');
A.eq(JSON.stringify(station.serialize()), beforeText, 'planning is detached and does not mutate the live station');
A.eq(plan.name, "PAULI'S PLACE", 'the product/city name is Pauli\'s Place');
A.eq(plan.document.meta.name, "PAULI'S PLACE", 'the compiled station document carries the Pauli\'s Place identity');
A.eq(plan.summary.districts, 8, 'default city has eight major districts');
A.eq(plan.summary.buildings, 11, 'default city stamps eleven first-wave buildings');
A.ok(plan.summary.roomsAdded >= 22, 'buildings plus connective corridors compile as one city');
A.ok(plan.summary.propsAdded > 50, 'city compiler places functional infrastructure in bulk');
A.ok(plan.summary.widthTiles <= 240 && plan.summary.heightTiles <= 240, 'first city stays inside the current WorldModel span guard');
A.eq(plan.routingErrors.length, 0, 'compiled city has no blocking routing errors');
A.ok(plan.vacancies.length > 0, 'a finite roster leaves honest vacancies instead of fabricated agents');

const hq = plan.buildings.find(b => b.templateId === 'executive_hq');
A.ok(hq && hq.agents.some(a => a.id === 'agent'), 'Heisenberg/orchestrator is assigned to HQ');
const compiled = WM.deserialize(plan.document);
A.ok(compiled.propsByAgent('agent').some(p => compiled.capForProp(p.t) === 'computer'), 'Heisenberg has a dedicated physical computer in the compiled city');
const heroCaps = compiled.bayObjects('agent');
for (const cap of ['computer', 'cabinet', 'dish', 'notebook', 'workbench']) A.ok(heroCaps.indexOf(cap) >= 0, 'HQ physically grants Heisenberg ' + cap);

// A remote pre-existing room may extend station bounds far north/south; it must never drag the first city
// row away from the spawn lane and produce a MAIN GATE that terminates beside, rather than inside, HQ.
const shifted = WM.create();
A.ok(shifted.addRoom({ kind: 'lab', rect: { x1: 0, y1: -100, x2: 6, y2: -94 }, name: 'REMOTE LAB' }).ok, 'remote north room extends legacy bounds');
const shiftedPlan = CityOS.plan(shifted, null, { roster: [roster[0]] });
A.ok(shiftedPlan.ok, 'city still compiles with a remote north room');
const shiftedCompiled = WM.deserialize(shiftedPlan.document);
const shiftedSpawn = shiftedCompiled.roomById(shiftedCompiled.spawnRoomId()).rects[0];
const shiftedFirst = shiftedCompiled.roomById(shiftedPlan.buildings[0].roomId).rects[0];
const mainGate = shiftedCompiled.rooms().find(r => r.name === 'MAIN GATE');
A.ok(mainGate && mainGate.rects && mainGate.rects.length, 'compiled city has a MAIN GATE');
const gateRect = mainGate.rects[0];
A.ok(gateRect.y1 >= Math.max(shiftedSpawn.y1, shiftedFirst.y1) && gateRect.y2 <= Math.min(shiftedSpawn.y2, shiftedFirst.y2), 'MAIN GATE occupies a Y lane shared by spawn and first city building');

// Prepare/apply is plan-id addressed; the live station must still match the exact planning base.
const prepared = CityOS.prepare(station, null, { roster });
A.ok(prepared.ok && /^paulis-city-/.test(prepared.planId), 'prepare mints a bounded plan id rather than returning the giant document to the model');
const applied = CityOS.applyPrepared(station, prepared.planId);
A.ok(applied.ok && applied.reversible, 'prepared city applies atomically and declares rollback');
A.eq(station.doc().meta.name, "PAULI'S PLACE", 'live station is now Pauli\'s Place');
A.eq(station.rooms().length, before.order.length + prepared.summary.roomsAdded, 'whole city landed in one apply');
const afterApply = JSON.stringify(station.serialize());
A.ok(afterApply !== beforeText, 'apply changed the live city');

const rolled = CityOS.undoLast(station);
A.ok(rolled.ok && rolled.restored, 'City OS rollback restores the exact pre-city document');
A.eq(JSON.stringify(station.serialize()), beforeText, 'rollback is byte-for-byte exact');

// A prepared plan cannot silently overwrite an intervening REFIT edit.
const stale = CityOS.prepare(station, null, { roster: [roster[0]] });
A.ok(stale.ok, 'second plan prepares');
A.ok(station.addRoom({ kind: 'lab', rect: { x1: 0, y1: 30, x2: 6, y2: 36 } }).ok, 'unrelated live edit lands after planning');
const refused = CityOS.applyPrepared(station, stale.planId);
A.ok(!refused.ok && refused.error === 'STALE_PLAN', 'stale city plan refuses instead of overwriting newer work');

A.report('cityos');
