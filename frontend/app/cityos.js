/* Pauli's Place City OS — declarative city compiler over the canonical WorldModel.
 *
 * The builder UI is one client of WorldModel; this is another. City OS never clicks REFIT and never writes
 * station.doc fields directly. It compiles a high-level CitySpec into ordinary validated WorldModel mutations
 * on a detached draft, proves the draft, then atomically swaps a freshly-deserialized proven runtime into the live
 * station while preserving its outer object identity. Manual REFIT remains the escape hatch and the save format
 * stays the same `SaveDoc.station` document.
 *
 * Browser: global `CityOS`. Node: module.exports. */
'use strict';

const CityOS = (() => {
  const WM = (typeof WorldModel !== 'undefined') ? WorldModel
    : (typeof require === 'function' ? require('./worldmodel.js') : null);
  const PS = (typeof PropSprites !== 'undefined') ? PropSprites
    : (typeof require === 'function' ? require('./propsprites.js') : null);
  const Pipe = (typeof Pipeline !== 'undefined') ? Pipeline
    : (typeof require === 'function' ? require('./pipeline.js') : null);

  const VERSION = 1;
  // Capture the station instance the APP creates without reaching into App's closure. City OS loads before
  // app.js, so wrapping the two factory calls is enough. Draft compilation uses the ORIGINAL deserialize
  // function below, which prevents a detached validation station from ever replacing this live pointer.
  const wmCreate = WM && WM.create ? WM.create.bind(WM) : null;
  const wmDeserialize = WM && WM.deserialize ? WM.deserialize.bind(WM) : null;
  let live = null;
  if (typeof window !== 'undefined' && WM && wmCreate && wmDeserialize && !WM.__paulisPlaceLiveCapture) {
    WM.__paulisPlaceLiveCapture = true;
    WM.create = function () { const st = wmCreate.apply(null, arguments); live = st; return st; };
    WM.deserialize = function () { const st = wmDeserialize.apply(null, arguments); live = st; return st; };
  }
  const DEFAULT_ROOM = { w: 24, h: 14 };
  const GRID = { cols: 4, gapX: 4, gapY: 4 };
  const prepared = new Map();
  const lastApplied = new WeakMap();
  let planSeq = 0;

  const CAP_PROP = {
    files: 'war_intelcab', web: 'comms_dish', memory: 'gigs_servercart', terminal: 'workbench',
    images: 'studio', spotify: 'jukebox'
  };

  /* BUILDING TEMPLATES are organizational intent, not coordinates. The planner owns coordinates and uses
     PropSprites for real footprints. `slots` describe desired native specialties; the current roster fills
     matching slots, once each. Empty slots are honest vacancies — City OS does not invent agents. */
  const BUILDING_TEMPLATES = Object.freeze({
    executive_hq: {
      label: 'HEISENBERG HQ', kind: 'bridge', floorStyle: 'cobalt', floorMat: 'panel',
      slots: ['orchestrator'], caps: ['files', 'web', 'memory', 'terminal'], decor: ['missionboard']
    },
    software_factory: {
      label: 'SOFTWARE FACTORY', kind: 'factory', floorStyle: 'rust', floorMat: 'tread',
      slots: ['engineer', 'apptester', 'auditor', 'reviewer'], caps: ['files', 'web', 'memory', 'terminal'], decor: ['whiteboard']
    },
    pi_foundry: {
      label: 'PI AGENT FOUNDRY', kind: 'factory', floorStyle: 'violet', floorMat: 'tread',
      slots: ['engineer', 'drafter', 'apptester', 'reviewer'], caps: ['files', 'web', 'memory', 'terminal'], decor: ['whiteboard']
    },
    revenue_center: {
      label: 'REVENUE CENTER', kind: 'hab', floorStyle: 'amber', floorMat: 'spine',
      slots: ['opportunist', 'researcher', 'prospector', 'treasurer'], caps: ['files', 'web', 'memory'], decor: ['missionboard']
    },
    creative_studio: {
      label: 'CREATIVE STUDIO', kind: 'lab', floorStyle: 'orchid', floorMat: 'tile',
      slots: ['designer', 'writer', 'marketer', 'publisher'], caps: ['files', 'web', 'memory', 'images'], decor: ['bigscreen']
    },
    commerce_factory: {
      label: 'COMMERCE FACTORY', kind: 'factory', floorStyle: 'ember', floorMat: 'tread',
      slots: ['operator', 'optimizer', 'publisher', 'treasurer'], caps: ['files', 'web', 'memory'], decor: ['missionboard']
    },
    connector_exchange: {
      label: 'CONNECTOR EXCHANGE', kind: 'storage', floorStyle: 'teal', floorMat: 'grate',
      slots: ['operator'], caps: ['files', 'web', 'memory'], connectorPorts: 4, decor: ['bigscreen']
    },
    intelligence_center: {
      label: 'INTELLIGENCE CENTER', kind: 'lab', floorStyle: 'indigo', floorMat: 'tile',
      slots: ['scout', 'analyst', 'researcher', 'curator'], caps: ['files', 'web', 'memory'], decor: ['whiteboard']
    },
    memory_archive: {
      label: 'MEMORY ARCHIVE', kind: 'storage', floorStyle: 'onyx', floorMat: 'panel',
      slots: ['archivist', 'curator'], caps: ['files', 'memory'], decor: ['bigscreen']
    },
    experiment_lab: {
      label: 'EXPERIMENT LAB', kind: 'lab', floorStyle: 'sterile', floorMat: 'tile',
      slots: ['analyst', 'apptester', 'reviewer', 'optimizer'], caps: ['files', 'web', 'memory', 'terminal'], decor: ['whiteboard']
    },
    night_ops: {
      label: 'NIGHT OPERATIONS', kind: 'bridge', floorStyle: 'crimson', floorMat: 'panel',
      slots: ['nightwatch', 'foreman', 'operator', 'scout'], caps: ['files', 'web', 'memory', 'terminal'], decor: ['missionboard']
    }
  });

  const DEFAULT_SPEC = Object.freeze({
    schema: 'paulis.place.city', version: 1, name: "PAULI'S PLACE",
    districts: [
      { id: 'command', label: 'COMMAND DISTRICT', buildings: [{ template: 'executive_hq' }] },
      { id: 'production', label: 'PRODUCTION DISTRICT', buildings: [{ template: 'software_factory' }, { template: 'pi_foundry' }] },
      { id: 'revenue', label: 'REVENUE DISTRICT', buildings: [{ template: 'revenue_center' }] },
      { id: 'creative', label: 'CREATIVE DISTRICT', buildings: [{ template: 'creative_studio' }] },
      { id: 'commerce', label: 'COMMERCE DISTRICT', buildings: [{ template: 'commerce_factory' }, { template: 'connector_exchange' }] },
      { id: 'intelligence', label: 'INTELLIGENCE DISTRICT', buildings: [{ template: 'intelligence_center' }, { template: 'memory_archive' }] },
      { id: 'experiment', label: 'EXPERIMENT DISTRICT', buildings: [{ template: 'experiment_lab' }] },
      { id: 'operations', label: 'OPERATIONS DISTRICT', buildings: [{ template: 'night_ops' }] }
    ]
  });

  const clone = v => JSON.parse(JSON.stringify(v));
  const clean = v => String(v == null ? '' : v).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  const sig = doc => JSON.stringify(doc || null);
  const fail = (error, msg, extra) => Object.assign({ ok: false, error, msg: msg || error }, extra || {});
  const publicAgent = a => a ? ({ id: a.id, name: a.name || a.id, specialtyId: a.specialtyId || null, role: a.role || null }) : null;

  function installRules() {
    if (!WM || !PS || !WM.setPropRules || !PS.spec) return;
    WM.setPropRules(t => {
      const s = PS.spec(t);
      return s ? { mount: s.mount || null, stack: !!s.stack, surface: !!s.surface, flat: !!s.flat } : null;
    });
  }

  function normalizeRoster(rows) {
    return (Array.isArray(rows) ? rows : []).filter(a => a && a.id).map(a => ({
      id: String(a.id), name: String(a.name || a.id), specialtyId: clean(a.specialtyId || ''),
      role: clean(a.role || ''), raw: a
    }));
  }

  function slotMatch(agent, want) {
    want = clean(want);
    if (!want) return false;
    if (want === 'orchestrator') return agent.id === 'agent' || agent.role === 'orchestrator';
    return agent.specialtyId === want || agent.role === want || clean(agent.name) === want || clean(agent.id) === want;
  }

  function flattenBuildings(spec) {
    const out = [];
    for (const d of (spec.districts || [])) {
      const did = clean(d.id || d.label || ('district_' + (out.length + 1)));
      for (const b0 of (d.buildings || [])) {
        const b = typeof b0 === 'string' ? { template: b0 } : clone(b0 || {});
        const t = BUILDING_TEMPLATES[b.template];
        if (!t) throw new Error('unknown building template: ' + b.template);
        out.push({ districtId: did, districtLabel: d.label || did, templateId: b.template, template: t, config: b });
      }
    }
    return out;
  }

  function chooseAssignments(buildings, roster) {
    const used = new Set(), result = [];
    for (const b of buildings) {
      const explicit = Array.isArray(b.config.agents) ? b.config.agents.map(String) : [];
      const slots = Array.isArray(b.config.slots) ? b.config.slots : b.template.slots;
      const assigned = [], vacancies = [];
      for (let i = 0; i < slots.length; i++) {
        const want = clean(slots[i]);
        let hit = null;
        const explicitId = explicit[i];
        if (explicitId) hit = roster.find(a => a.id === explicitId && !used.has(a.id)) || null;
        if (!hit) hit = roster.find(a => !used.has(a.id) && slotMatch(a, want)) || null;
        if (hit) { used.add(hit.id); assigned.push({ slot: want, agent: hit }); }
        else vacancies.push(want);
      }
      result.push({ building: b, assigned, vacancies });
    }
    return result;
  }

  function roomName(row, index) {
    const base = String(row.config.name || row.template.label || row.templateId).toUpperCase();
    return (base.length <= 24 ? base : base.slice(0, 24)).replace(/\s+$/g, '') || ('BUILDING-' + (index + 1));
  }

  function specOf(id) {
    const s = PS && PS.spec ? PS.spec(id) : null;
    if (!s) throw new Error('prop catalog has no type ' + id);
    return s;
  }

  function findPropSpot(station, room, type, zone) {
    const s = specOf(type), r = room.rects[0];
    const minY = zone && zone.minY != null ? zone.minY : r.y1;
    const maxY = zone && zone.maxY != null ? zone.maxY : r.y2;
    const minX = zone && zone.minX != null ? zone.minX : r.x1;
    const maxX = zone && zone.maxX != null ? zone.maxX : r.x2;
    for (let y = minY; y + s.h - 1 <= maxY; y++) {
      for (let x = minX; x + s.w - 1 <= maxX; x++) {
        const v = station.canPlaceProp(type, x, y, s.w, s.h);
        if (v && v.ok) return { x, y, spec: s };
      }
    }
    return null;
  }

  function addCatalogProp(station, room, type, zone, opts) {
    const spot = findPropSpot(station, room, type, zone);
    if (!spot) return fail('NO_PROP_SPACE', 'no valid spot for ' + type + ' in ' + room.name);
    const r = station.addProp(Object.assign({ t: type, x: spot.x, y: spot.y, w: spot.spec.w, h: spot.spec.h, block: spot.spec.blocks !== false }, opts || {}));
    return r.ok ? Object.assign(r, { x: spot.x, y: spot.y, type }) : r;
  }

  function placeAgentDesk(station, room, agent, slotIndex) {
    const r = room.rects[0];
    const target = { x: r.x1 + 2 + (slotIndex * 5), y: r.y1 + 1 };
    const computers = station.propsByAgent(agent.id).filter(p => station.capForProp(p.t) === 'computer');
    let primary = computers[0] || null;
    // Move the existing workstation when possible; this preserves its skin/art and makes the city a re-org,
    // not a destructive reset. Unbind duplicate PCs so the capability-room resolver has one honest seat.
    if (primary) {
      const mv = station.moveProp(primary.id, target.x - primary.x, target.y - primary.y);
      if (mv.ok) {
        for (let i = 1; i < computers.length; i++) station.assignPropAgent(computers[i].id, '');
        return { ok: true, id: primary.id, moved: true, x: target.x, y: target.y };
      }
      station.assignPropAgent(primary.id, '');
      for (let i = 1; i < computers.length; i++) station.assignPropAgent(computers[i].id, '');
    }
    const ds = specOf('desk');
    const v = station.canPlaceProp('desk', target.x, target.y, ds.w, ds.h);
    if (!v.ok) return fail(v.error || 'NO_DESK_SPACE', v.msg || 'cannot place desk for ' + agent.id);
    const add = station.addProp({ t: 'desk', x: target.x, y: target.y, w: ds.w, h: ds.h, block: true });
    if (!add.ok) return add;
    const bind = station.assignPropAgent(add.id, agent.id);
    return bind.ok ? { ok: true, id: add.id, x: target.x, y: target.y } : bind;
  }

  function placeSharedCaps(station, room, caps, connectors) {
    const r = room.rects[0], placed = [];
    const zone = { minX: r.x1 + 1, maxX: r.x2 - 1, minY: r.y1 + 4, maxY: r.y2 - 5 };
    for (const cap of (caps || [])) {
      const type = CAP_PROP[clean(cap)];
      if (!type) continue;
      const p = addCatalogProp(station, room, type, zone);
      if (!p.ok) return p;
      placed.push({ cap: clean(cap), type, id: p.id });
    }
    const requested = Array.isArray(connectors) ? connectors : [];
    for (const c0 of requested) {
      const cfg = typeof c0 === 'string' ? { connectorId: c0 } : (c0 || {});
      const p = addCatalogProp(station, room, 'connector_portal', zone);
      if (!p.ok) return p;
      if (cfg.connectorId) {
        const b = station.bindConnector(p.id, String(cfg.connectorId));
        if (!b.ok) return b;
      }
      placed.push({ cap: 'connector', type: 'connector_portal', id: p.id, connectorId: cfg.connectorId || null });
    }
    return { ok: true, placed };
  }

  function placeDecor(station, room, decor) {
    const r = room.rects[0], placed = [];
    const zone = { minX: r.x1 + 1, maxX: r.x2 - 1, minY: r.y1, maxY: r.y1 + 3 };
    for (const type of (decor || [])) {
      const p = addCatalogProp(station, room, type, zone);
      if (p.ok) placed.push(p.id); // cosmetic failure never invalidates a city plan
    }
    return placed;
  }

  function unbindOldBays(station, agentId) {
    for (const p of station.propsByAgent(agentId)) if (p.t === 'bay') station.assignPropAgent(p.id, '');
  }

  function buildWorkflow(station, room, assigned) {
    if (!assigned.length) return { ok: true, machines: [], edges: [] };
    const r = room.rects[0], y = r.y2 - 2;
    const machines = [], edges = [];
    const addAt = (t, x) => {
      const s = specOf(t), v = station.canPlaceProp(t, x, y, s.w, s.h);
      if (!v.ok) return v;
      return station.addProp({ t, x, y, w: s.w, h: s.h, block: s.blocks !== false });
    };
    const intake = addAt('intake', r.x1 + 1); if (!intake.ok) return intake;
    machines.push(intake.id);
    let prev = intake.id;
    for (let i = 0; i < assigned.length; i++) {
      const a = assigned[i].agent;
      unbindOldBays(station, a.id);
      const bay = addAt('bay', r.x1 + 5 + i * 4); if (!bay.ok) return bay;
      const bind = station.assignPropAgent(bay.id, a.id); if (!bind.ok) return bind;
      const brief = assigned[i].brief || ('Own the ' + assigned[i].slot + ' step for work entering ' + room.name + '. Return evidence with the result.');
      const br = station.setPropBrief(bay.id, brief); if (!br.ok) return br;
      const wire = station.connectBelt(prev, bay.id); if (!wire.ok) return wire;
      machines.push(bay.id); prev = bay.id;
      if (i > 0) edges.push({ from: assigned[i - 1].agent.id, to: a.id, whenKind: 'handoff' });
    }
    const outX = Math.min(r.x2 - 2, r.x1 + 5 + assigned.length * 4);
    const outbox = addAt('outbox', outX); if (!outbox.ok) return outbox;
    const wireOut = station.connectBelt(prev, outbox.id); if (!wireOut.ok) return wireOut;
    machines.push(outbox.id);
    return { ok: true, machines, edges };
  }

  function connectRooms(station, upperLeftRooms, cols) {
    if (!upperLeftRooms.length) return { ok: true, ids: [] };
    const ids = [];
    for (let i = 1; i < upperLeftRooms.length; i++) {
      const prev = upperLeftRooms[i - 1], cur = upperLeftRooms[i];
      const prevRow = Math.floor((i - 1) / cols), curRow = Math.floor(i / cols);
      if (prevRow === curRow) {
        const a = prev.rects[0], b = cur.rects[0];
        const cy = a.y1 + Math.floor((a.y2 - a.y1 - 1) / 2);
        const res = station.placeHallway({ rect: { x1: a.x2 + 1, y1: cy, x2: b.x1 - 1, y2: cy + 1 }, name: 'CITY WALK' });
        if (!res.ok) return res; ids.push(res.id);
      } else {
        // Row transition: connect the first building in the new row vertically to the first building in
        // the previous row. This creates a ladder-shaped city graph without crossing corridors.
        const up = upperLeftRooms[(curRow - 1) * cols], down = upperLeftRooms[curRow * cols];
        const a = up.rects[0], b = down.rects[0];
        const cx = a.x1 + 2;
        const res = station.placeHallway({ rect: { x1: cx, y1: a.y2 + 1, x2: cx + 1, y2: b.y1 - 1 }, name: 'CITY WALK' });
        if (!res.ok) return res; ids.push(res.id);
      }
    }
    return { ok: true, ids };
  }

  function connectSpawn(station, firstRoom) {
    if (!firstRoom) return { ok: true };
    const spawn = station.roomById(station.spawnRoomId());
    if (!spawn || !spawn.rects || !spawn.rects.length) return { ok: true };
    const a = spawn.rects[0], b = firstRoom.rects[0];
    if (a.x2 >= b.x1) return { ok: true }; // already touching/overlapping in x; normal validators own it
    const y1 = Math.max(a.y1 + 2, Math.min(a.y2 - 1, b.y1 + 4));
    const res = station.placeHallway({ rect: { x1: a.x2 + 1, y1, x2: b.x1 - 1, y2: y1 + 1 }, name: 'MAIN GATE' });
    return res;
  }

  function normalizedSpec(spec) {
    const out = spec ? clone(spec) : clone(DEFAULT_SPEC);
    if (!out.schema) out.schema = 'paulis.place.city';
    if (!out.version) out.version = 1;
    if (!out.name) out.name = "PAULI'S PLACE";
    if (!Array.isArray(out.districts) || !out.districts.length) throw new Error('city spec needs at least one district');
    return out;
  }

  function buildPlan(station, spec, opts) {
    if (!WM || !station || typeof station.serialize !== 'function') return fail('NO_STATION', 'City OS needs a live WorldModel station');
    installRules();
    opts = opts || {};
    let city;
    try { city = normalizedSpec(spec); } catch (e) { return fail('BAD_SPEC', e.message); }
    const baseDoc = station.serialize(), baseSignature = sig(baseDoc);
    const draft = wmDeserialize ? wmDeserialize(baseDoc) : WM.deserialize(baseDoc);
    const roster = normalizeRoster(opts.roster || []);
    let buildings;
    try { buildings = flattenBuildings(city); } catch (e) { return fail('BAD_SPEC', e.message); }
    const assignmentRows = chooseAssignments(buildings, roster);

    const bounds = draft.bounds();
    const spawn = draft.roomById(draft.spawnRoomId());
    const spawnRect = spawn && spawn.rects && spawn.rects[0];
    // Keep the first city row on the trunk/spawn lane. A remote room can extend bounds.minTy far north,
    // but it must never drag the city away from the MAIN GATE and leave a visually stamped disconnected city.
    const origin = opts.origin || { x: bounds.maxTx + 7, y: spawnRect ? spawnRect.y1 : bounds.minTy };
    const cols = Math.max(1, Math.min(6, Number(opts.columns) || GRID.cols));
    const gapX = GRID.gapX, gapY = GRID.gapY;
    const rooms = [], records = [], allEdges = draft.pipelineEdges ? draft.pipelineEdges() : [];

    for (let i = 0; i < assignmentRows.length; i++) {
      const row = assignmentRows[i], t = row.building.template, cfg = row.building.config;
      const size = Object.assign({}, DEFAULT_ROOM, t.size || {}, cfg.size || {});
      const c = i % cols, rr = Math.floor(i / cols);
      const x = (origin.x | 0) + c * (size.w + gapX), y = (origin.y | 0) + rr * (size.h + gapY);
      const roomRes = draft.addRoom({ kind: cfg.kind || t.kind || 'hab', name: roomName(row.building, i),
        rect: { x1: x, y1: y, x2: x + size.w - 1, y2: y + size.h - 1 },
        floorStyle: cfg.floorStyle || t.floorStyle, floorMat: cfg.floorMat || t.floorMat });
      if (!roomRes.ok) return fail('LAYOUT_' + (roomRes.error || 'ROOM'), roomRes.msg, { building: t.label, cause: roomRes });
      const room = draft.roomById(roomRes.id); rooms.push(room);
      records.push({ districtId: row.building.districtId, templateId: row.building.templateId, roomId: room.id,
        name: room.name, agents: row.assigned.map(x => publicAgent(x.agent)), vacancies: row.vacancies.slice() });
    }

    const joined = connectRooms(draft, rooms, cols);
    if (!joined.ok) return fail('LAYOUT_' + (joined.error || 'HALL'), joined.msg, { cause: joined });
    const gate = connectSpawn(draft, rooms[0]);
    if (!gate.ok) return fail('LAYOUT_' + (gate.error || 'GATE'), gate.msg, { cause: gate });

    for (let i = 0; i < assignmentRows.length; i++) {
      const row = assignmentRows[i], room = rooms[i], cfg = row.building.config, t = row.building.template;
      // A city re-organization puts each assigned worker's actual workstation in the building that owns it.
      for (let n = 0; n < row.assigned.length; n++) {
        const desk = placeAgentDesk(draft, room, row.assigned[n].agent, n);
        if (!desk.ok) return fail('CAPABILITY_' + (desk.error || 'DESK'), desk.msg, { room: room.name, agentId: row.assigned[n].agent.id });
      }
      const caps = placeSharedCaps(draft, room, cfg.caps || t.caps || [], cfg.connectors || []);
      if (!caps.ok) return fail('CAPABILITY_' + (caps.error || 'PROP'), caps.msg, { room: room.name });
      // Connector Exchange ships physical portals even before credentials are bound. Unbound = no grant.
      const extraPorts = Math.max(0, (Number(cfg.connectorPorts != null ? cfg.connectorPorts : t.connectorPorts) || 0) - ((cfg.connectors || []).length));
      for (let p = 0; p < extraPorts; p++) {
        const r = room.rects[0];
        const add = addCatalogProp(draft, room, 'connector_portal', { minX: r.x1 + 1, maxX: r.x2 - 1, minY: r.y1 + 4, maxY: r.y2 - 5 });
        if (!add.ok) return fail('CAPABILITY_' + (add.error || 'CONNECTOR'), add.msg, { room: room.name });
      }
      placeDecor(draft, room, cfg.decor || t.decor || []);
      const wfAssigned = row.assigned.map(a => Object.assign({}, a, { brief: cfg.briefs && cfg.briefs[a.slot] }));
      const flow = buildWorkflow(draft, room, wfAssigned);
      if (!flow.ok) return fail('WORKFLOW_' + (flow.error || 'BUILD'), flow.msg, { room: room.name, cause: flow });
      for (const e of flow.edges) allEdges.push(e);
    }
    if (draft.setPipelineEdges) draft.setPipelineEdges(allEdges);

    const geo = draft.projectGeometry();
    const routing = Pipe && Pipe.compileRoutingPlan ? Pipe.compileRoutingPlan(geo) : null;
    const routingErrors = routing && Array.isArray(routing.errors) ? routing.errors.filter(e => !e.warn) : [];
    if (routingErrors.length) return fail('ROUTING_INVALID', 'compiled city has blocking workflow errors', { routingErrors: clone(routingErrors) });

    const plannedDoc = draft.serialize();
    plannedDoc.meta = plannedDoc.meta || {}; plannedDoc.meta.name = city.name;
    const span = draft.bounds();
    const vacancies = records.reduce((a, r) => a.concat(r.vacancies.map(v => ({ building: r.name, specialty: v }))), []);
    const summary = {
      districts: city.districts.length, buildings: records.length,
      roomsAdded: draft.rooms().length - station.rooms().length,
      propsAdded: draft.props().length - station.props().length,
      beltsAdded: draft.belts().length - station.belts().length,
      assignedAgents: records.reduce((n, r) => n + r.agents.length, 0), vacancies: vacancies.length,
      widthTiles: span.maxTx - span.minTx + 1, heightTiles: span.maxTy - span.minTy + 1
    };
    return { ok: true, version: VERSION, name: city.name, spec: city, baseSignature, document: plannedDoc,
      summary, buildings: records, vacancies, routingErrors: [], createdFrom: { rooms: station.rooms().length, props: station.props().length, belts: station.belts().length } };
  }

  function publicPlan(plan) {
    return { ok: !!plan.ok, planId: plan.planId || null, name: plan.name, summary: clone(plan.summary || {}),
      buildings: clone(plan.buildings || []), vacancies: clone(plan.vacancies || []), routingErrors: clone(plan.routingErrors || []), canApply: !!plan.ok };
  }

  function plan(station, spec, opts) { return buildPlan(station, spec, opts); }

  function prepare(station, spec, opts) {
    const p = buildPlan(station, spec, opts);
    if (!p.ok) return p;
    p.planId = 'paulis-city-' + (++planSeq);
    prepared.set(p.planId, p);
    while (prepared.size > 8) prepared.delete(prepared.keys().next().value);
    return publicPlan(p);
  }

  function swapStation(target, source) {
    if (!target || !source) return fail('BAD_SWAP', 'station runtime required');
    const keep = new Set(Object.keys(source));
    for (const k of Object.keys(target)) if (!keep.has(k)) delete target[k];
    for (const k of Object.keys(source)) target[k] = source[k];
    return { ok: true };
  }

  function apply(station, p) {
    if (!p || !p.ok || !p.document) return fail('BAD_PLAN', 'a proven City OS plan is required');
    if (sig(station.serialize()) !== p.baseSignature) return fail('STALE_PLAN', 'station changed after this plan was prepared — plan again');
    const before = station.serialize();
    const replacement = wmDeserialize ? wmDeserialize(p.document) : WM.deserialize(p.document);
    const r = swapStation(station, replacement);
    if (!r.ok) return r;
    const afterSignature = sig(station.serialize());
    lastApplied.set(station, { planId: p.planId || null, beforeDocument: before, beforeSignature: sig(before), afterSignature });
    if (p.planId) prepared.delete(p.planId);
    return { ok: true, planId: p.planId || null, name: p.name, summary: clone(p.summary), reversible: true, atomic: true };
  }

  function applyPrepared(station, planId) {
    const p = prepared.get(String(planId || ''));
    if (!p) return fail('PLAN_NOT_FOUND', 'no prepared city plan called ' + String(planId || '(blank)'));
    return apply(station, p);
  }

  function undoLast(station) {
    const last = lastApplied.get(station);
    if (!last) return fail('NOTHING', 'no City OS apply is recorded for this station');
    if (sig(station.serialize()) !== last.afterSignature) return fail('CITY_CHANGED', 'station changed since the city was applied — use normal REFIT review instead of a blind city rollback');
    const replacement = wmDeserialize ? wmDeserialize(last.beforeDocument) : WM.deserialize(last.beforeDocument);
    const r = swapStation(station, replacement);
    if (!r.ok) return r;
    lastApplied.delete(station);
    return { ok: true, revertedPlanId: last.planId, restored: sig(station.serialize()) === last.beforeSignature, atomic: true };
  }

  function inspect(station) {
    if (!station || typeof station.serialize !== 'function') return fail('NO_STATION', 'station is not ready');
    const b = station.bounds(), rooms = station.rooms(), props = station.props();
    const agents = {};
    for (const p of props) if (p.agentId) {
      const a = agents[p.agentId] || (agents[p.agentId] = { agentId: p.agentId, props: 0, bays: 0, capabilities: [] });
      a.props++; if (p.t === 'bay') a.bays++;
    }
    for (const aid of Object.keys(agents)) agents[aid].capabilities = station.bayObjects ? station.bayObjects(aid) : [];
    return { ok: true, name: (station.doc().meta && station.doc().meta.name) || 'STARNET STATION', rooms: rooms.length,
      corridors: rooms.filter(r => r.kind === 'corridor').length, props: props.length, belts: station.belts().length,
      bounds: b, widthTiles: b.maxTx - b.minTx + 1, heightTiles: b.maxTy - b.minTy + 1,
      agents: Object.values(agents) };
  }

  function diff(station, p) {
    if (!p || !p.ok) return fail('BAD_PLAN', 'plan required');
    const now = inspect(station);
    return { ok: true, planId: p.planId || null, before: now, after: clone(p.summary), stale: sig(station.serialize()) !== p.baseSignature };
  }

  return {
    VERSION, BUILDING_TEMPLATES, DEFAULT_SPEC,
    liveStation: () => live,
    plan, prepare, apply, applyPrepared, undoLast, inspect, diff,
    publicPlan, _internals: { normalizeRoster, flattenBuildings, chooseAssignments, slotMatch, swapStation }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CityOS;
