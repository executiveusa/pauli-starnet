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

// activityFeed: the all-viewers gateway feed is the same activeTasks the map moves on -
// normalized, newest first, capped, statuses verbatim, receipts carried.
{
  const feed = CityCore.activityFeed({ activeTasks: [
    { id: 'old', status: 'failed', task: 'earlier task', receiptId: 'r-old', startedAt: '2026-09-11T07:00:00Z', completedAt: '2026-09-11T07:05:00Z' },
    { id: 'new', status: 'running', task: 'current task', receipt: { receipt_id: 'r-new' }, startedAt: '2026-09-11T07:10:00Z' }
  ] });
  A.eq(feed.length, 2, 'feed carries both entries');
  A.eq(feed[0].id, 'new', 'newest first');
  A.eq(feed[0].receiptId, 'r-new', 'receipt id from nested receipt object');
  A.eq(feed[1].status, 'failed', 'failed stays failed - verbatim, never dressed up');
  A.eq(feed[1].completedAt, '2026-09-11T07:05:00Z', 'completedAt carried for the settled line');
  A.eq(CityCore.activityFeed(null).length, 0, 'no status means an honestly empty feed');
  A.eq(CityCore.activityFeed({ activeTasks: Array.from({ length: 30 }, (_, i) => ({ id: 't' + i, startedAt: '2026-09-11T07:' + String(i).padStart(2, '0') + ':00Z' })) }).length, 20, 'feed capped at 20');
}
// source-locked wiring: the panel sections, the map-header line, and the poll calls.
{
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/../frontend/city/index.html', 'utf8');
  A.ok(html.includes('id="gw-feed"') && html.includes('Gateway activity'), 'index.html carries the all-viewers gateway feed section');
  A.ok(html.includes('id="lastact"'), 'index.html carries the last-activity line');
  const js = fs.readFileSync(__dirname + '/../frontend/city/city.js', 'utf8');
  A.ok(/renderFeed\(\); renderLastAct\(\)/.test(js.replace(/\s+/g, ' ')) || (js.includes('renderFeed()') && js.includes('renderLastAct()')), 'poll renders feed + last-activity');
  A.ok(js.includes('CityCore.activityFeed'), 'feed rows come from the pure tested helper');
}

// walkPath: the visible route between two evidenced positions - endpoints exact,
// a bend off the straight line, degenerate inputs honest.
{
  const path = CityCore.walkPath({ x: 52, y: 204 }, { x: 286, y: 56 });
  A.eq(path.length, 3, 'walk path is from -> bend -> to');
  A.eq(path[0], { x: 52, y: 204 }, 'path starts at the evidenced desk position exactly');
  A.eq(path[2], { x: 286, y: 56 }, 'path ends at the evidenced work position exactly');
  const onLine = (path[1].x - 52) * (56 - 204) === (path[1].y - 204) * (286 - 52);
  A.ok(!onLine, 'the bend is off the straight line - reads as a route, not a slide');
  A.eq(CityCore.walkPath({ x: 7, y: 7 }, { x: 7, y: 7 }), [{ x: 7, y: 7 }], 'same spot is a single point, no fake travel');
  A.eq(CityCore.walkPath(null, { x: 1, y: 1 }).length, 0, 'missing endpoint means no path, honestly');
}
// source-locked wiring: the REAL 2D world is the primary view - the app's own renderer,
// world geometry from the gateway, movement bound to gateway running tasks only.
{
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/../frontend/city/index.html', 'utf8');
  A.ok(html.includes('<canvas id="world"'), 'index.html carries the full-viewport world canvas');
  A.ok(html.includes('world/world.js'), 'index.html loads the real world renderer');
  A.ok(html.includes('world/worldmodel.js') && html.includes('world/propsprites.js') && html.includes('world/stationbake.js'), 'index.html loads the world runtime stack');
  A.ok(!html.includes('id="map"'), 'the old dot-map shell is gone from the page');
  const wjs = fs.readFileSync(__dirname + '/../frontend/city/city-world.js', 'utf8');
  A.ok(wjs.includes('/v1/city/world'), 'world geometry comes from the read-only gateway route');
  A.ok(wjs.includes('World.loadStation') && wjs.includes('WorldModel.deserialize'), 'the gateway document becomes the live station');
  A.ok(wjs.includes('World.spawn') && wjs.includes('World.spawnAgent'), 'roster citizens spawn as real world bodies');
  A.ok(wjs.includes('World.setActivityFor'), 'movement binds through the app\'s own activity seam');
  A.ok(wjs.includes('CityCore.worldActivityDiff'), 'movement changes come from the pure tested diff');
  A.ok(!wjs.includes('setInterval'), 'the world never invents motion on a timer');
  const css = fs.readFileSync(__dirname + '/../frontend/city/city.css', 'utf8');
  A.ok(css.includes('#world'), 'canvas has a full-stage style');
}

// worldSpawnPlan: hero identity + deterministic neutral skins, roster-truthful.
{
  const plan = CityCore.worldSpawnPlan([
    { id: 'ecom-merci', name: 'MERCI' }, { id: 'agent', name: 'HEISENBERG' }, { id: 'ecom-ledger', name: 'LEDGER' }
  ]);
  A.eq(plan[0], { id: 'agent', name: 'HEISENBERG', hero: true, skin: 'heisenberg' }, 'the orchestrator is the hero with its namesake skin');
  A.eq(plan.length, 3, 'every citizen gets a body');
  A.ok(plan[1].hero === false && plan[1].skin !== 'heisenberg', 'crew never wears the hero skin');
  A.eq(CityCore.worldSpawnPlan([]).length, 0, 'empty roster spawns nobody - no invented agents');
  A.eq(CityCore.worldSpawnPlan([{ id: 'ecom-merci' }])[0].skin, CityCore.WORLD_SKIN_POOL[0], 'a non-Heisenberg hero draws from the neutral pool');
}

// worldActivityDiff: bodies work iff the gateway shows a running task naming them.
{
  const running = { activeTasks: [
    { id: 't1', status: 'running', context: { agentId: 'agent' } },
    { id: 't2', status: 'failed', context: { agentId: 'ecom-merci' } },
    { id: 't3', status: 'completed', context: { agentId: 'ecom-ledger' } }
  ] };
  A.eq(Array.from(CityCore.worldWorkSet(running)), ['agent'], 'only RUNNING tasks light a body');
  A.eq(CityCore.worldActivityDiff({}, running, ['agent', 'ecom-merci']), [{ id: 'agent', kind: 'task' }], 'task start seizes exactly the named body');
  A.eq(CityCore.worldActivityDiff({ agent: true }, running, ['agent']), [], 'a still-running task is not re-seized');
  A.eq(CityCore.worldActivityDiff({ agent: true }, { activeTasks: [] }, ['agent']), [{ id: 'agent', kind: 'idle' }], 'task settle releases the body back to idle');
  A.eq(CityCore.worldActivityDiff({}, { activeTasks: [{ id: 't9', status: 'running' }] }, ['agent']), [], 'a task without an agentId moves nobody');
}

// occupiedFrame: the boot camera frames occupied buildings + visible agents, honestly.
{
  const snaps = [
    { id: 'agent', x: 100, y: 100, placed: true },
    { id: 'ecom-merci', x: 340, y: 220, placed: true },
    { id: 'ecom-ledger', x: 0, y: 0, placed: false }
  ];
  A.eq(CityCore.occupiedFrame(snaps), { x0: 40, y0: 40, x1: 400, y1: 280, count: 2 }, 'frame bounds the placed bodies with pad, unplaced excluded');
  A.eq(CityCore.occupiedFrame(snaps, 0), { x0: 100, y0: 100, x1: 340, y1: 220, count: 2 }, 'zero pad is the exact bbox');
  A.eq(CityCore.occupiedFrame([]), null, 'no bodies means no frame - never an invented rect');
  A.eq(CityCore.occupiedFrame([{ id: 'x', x: NaN, y: 5, placed: true }]), null, 'broken snapshots frame nothing');
}
// overlay discipline: closed by default, canvas unobstructed, fallback truly hidden.
{
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/../frontend/city/index.html', 'utf8');
  A.ok(html.includes('<body class="panel-hidden">'), 'the activity panel starts CLOSED - the city is the first thing you see');
  A.ok(html.includes('id="panel-close"'), 'the panel has an explicit close control');
  const css = fs.readFileSync(__dirname + '/../frontend/city/city.css', 'utf8');
  A.ok(css.includes('.worldfallback[hidden] { display: none; }'), 'a hidden fallback never paints over the canvas');
  const js = fs.readFileSync(__dirname + '/../frontend/city/city.js', 'utf8');
  A.ok(js.includes("ev.key === 'Escape'"), 'Escape closes the panel');
  const wjs = fs.readFileSync(__dirname + '/../frontend/city/city-world.js', 'utf8');
  A.ok(wjs.includes('CityCore.occupiedFrame') && wjs.includes('World.frameRect'), 'boot camera frames the occupied buildings + visible agents');
}

// public read-only parity: no writes, no visitor token, desktop composition behaviors.
{
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/../frontend/city/index.html', 'utf8');
  A.ok(!html.includes('id="taskdialog"') && !html.includes('id="task-open"') && !html.includes('id="settings"') && !html.includes('id="settings-btn"'), 'no visitor task/settings/token controls in the markup');
  A.ok(!html.includes('approvals-list') && !html.includes('tasks-list'), 'approvals and device-task panels are gone from the public surface');
  A.ok(html.includes('id="whole-city"'), 'an explicit whole-city camera toggle exists');
  A.ok(html.includes('world/zones.js'), 'zones.js loads so the desktop idle leash applies');
  const js = fs.readFileSync(__dirname + '/../frontend/city/city.js', 'utf8');
  A.ok(!js.includes('localStorage') && !js.includes('Authorization') && !js.includes('POST'), 'the overlay holds no token, stores nothing, sends no writes');
  A.ok(js.includes("DEFAULT_GW = '/.netlify/functions/gw'") && !js.includes('params.get'), 'the backend URL is fixed - a visitor cannot repoint the page');
  const wjs = fs.readFileSync(__dirname + '/../frontend/city/city-world.js', 'utf8');
  A.ok(wjs.includes('World.centerView') && wjs.includes('2.7'), 'boot camera centers the occupied hero building at desktop-like zoom');
  A.ok(wjs.includes('World.crt.scan = 0.20') && wjs.includes('World.crt.aberr = 0.12'), 'CRT softened to the website/app demo values');
  A.ok(wjs.includes('setCinecamIdle(120000)'), 'explicit cinecam policy: the desktop 2-minute hands-off default');
  const app = fs.readFileSync(__dirname + '/../frontend/app/world.js', 'utf8');
  A.ok(app.includes('function centerView(') && app.includes('frameRect, centerView, bodySnapshots,'), 'world.js exports centerView for the boot camera');
  const css = fs.readFileSync(__dirname + '/../frontend/city/city.css', 'utf8');
  A.ok(css.includes('#nl-badge-frame'), 'the Netlify HUD is tucked out of the play space');
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
