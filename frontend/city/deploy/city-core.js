/* Pauli's Place — city web surface core (pure logic, no DOM).
 * The canonical city manifest stays in frontend/app/cityos.js (CityOS.DEFAULT_SPEC +
 * CityOS.BUILDING_TEMPLATES). This module only reads that manifest and shapes it for
 * rendering, live-status classification, and gateway task/receipt payloads. It never
 * invents agents, activity, revenue, or state the backend cannot prove.
 * Browser: global CityCore. Node: module.exports. */
'use strict';

const CityCore = (() => {

  /* Pull the render model out of the canonical CityOS manifest. */
  function cityModel(cityOS) {
    if (!cityOS || !cityOS.DEFAULT_SPEC || !cityOS.BUILDING_TEMPLATES) {
      throw new Error('CityOS manifest required (DEFAULT_SPEC + BUILDING_TEMPLATES)');
    }
    const spec = cityOS.DEFAULT_SPEC;
    const templates = cityOS.BUILDING_TEMPLATES;
    const districts = spec.districts.map(d => ({
      id: d.id,
      label: d.label || d.id,
      buildings: (d.buildings || []).map(b => {
        const t = templates[b.template];
        if (!t) throw new Error('unknown building template: ' + b.template);
        return {
          templateId: b.template,
          label: t.label,
          kind: t.kind,
          floorStyle: t.floorStyle,
          slots: (t.slots || []).slice(),
          caps: (t.caps || []).slice(),
          connectorPorts: t.connectorPorts || 0
        };
      })
    }));
    return {
      schema: spec.schema, version: spec.version, name: spec.name,
      districts,
      counts: {
        districts: districts.length,
        buildings: districts.reduce((n, d) => n + d.buildings.length, 0),
        slots: districts.reduce((n, d) => n + d.buildings.reduce((m, b) => m + b.slots.length, 0), 0)
      }
    };
  }

  /* Every (district, building, slot) triple — the full honest vacancy list. */
  function flattenSlots(model) {
    const out = [];
    for (const d of model.districts) {
      for (const b of d.buildings) {
        for (const s of b.slots) out.push({ districtId: d.id, districtLabel: d.label, templateId: b.templateId, buildingLabel: b.label, slot: s });
      }
    }
    return out;
  }

  /* Classify a /v1/city/status payload. No payload, malformed payload, or
     degraded:true all stay honest — never upgrade to 'live' without evidence. */
  /* The public surface consumes ONLY the Netlify function's sanitized DTO:
     { live, city, generatedAgoMin, citizens:[{name,role,district,status,hero?}],
       activity:[{event,state,agent,summary,startedAgoMin,settledAgoMin,receipt}] }.
     No internal ids, no timestamps, no prompts, no errors, no provider internals. */
  function classifyStatus(payload) {
    if (!payload || typeof payload !== 'object') return { mode: 'offline', label: 'No live state', citizens: [], missions: [], approvals: [], activeTasks: [] };
    const citizens = Array.isArray(payload.citizens) ? payload.citizens : [];
    const activeTasks = Array.isArray(payload.activity) ? payload.activity : [];
    const live = payload.live === true;
    return {
      mode: live ? 'live' : 'degraded',
      label: live ? 'Live' : 'Backend degraded',
      citizens, missions: [], approvals: [], activeTasks,
      generatedAgoMin: (typeof payload.generatedAgoMin === 'number') ? payload.generatedAgoMin : null
    };
  }

  /* Seat live citizens into canonical slots by specialty/role match. Unmatched
     slots stay vacancies; citizens that match no slot are listed as unassigned.
     A roster name is not proof of activity — 'seated' means present in roster only. */
  function seatCitizens(model, citizens) {
    const roster = Array.isArray(citizens) ? citizens.slice() : [];
    const used = new Set();
    const seating = {};
    const matches = (c, slot) => {
      const spec = String(c.specialtyId || c.specialty || '').toLowerCase();
      const role = String(c.role || '').toLowerCase();
      return spec === slot || role === slot;
    };
    // Pass 1: a citizen whose roster record carries a district sits only in that
    // district — the roster's own placement beats first-slot-wins ordering.
    for (const entry of flattenSlots(model)) {
      const key = entry.districtId + '/' + entry.templateId + '/' + entry.slot;
      const idx = roster.findIndex((c, i) => !used.has(i) && c.district && String(c.district).toLowerCase() === entry.districtId && matches(c, entry.slot));
      if (idx >= 0) { used.add(idx); seating[key] = roster[idx]; }
    }
    // Pass 2: citizens with no district evidence take the first open matching slot.
    for (const entry of flattenSlots(model)) {
      const key = entry.districtId + '/' + entry.templateId + '/' + entry.slot;
      if (seating[key]) continue;
      const idx = roster.findIndex((c, i) => !used.has(i) && matches(c, entry.slot));
      if (idx >= 0) { used.add(idx); seating[key] = roster[idx]; }
      else seating[key] = null; // honest vacancy
    }
    const unassigned = roster.filter((c, i) => !used.has(i));
    return { seating, unassigned };
  }

  /* Gateway task payload. The gateway route is POST /v1/heisenberg/tasks with
     {task, context}. Routing metadata rides in context so Heisenberg decomposes
     to the right district/building/slot. Consequential work stays approval-gated
     downstream; this surface cannot and does not bypass that. */
  function buildTaskPayload(opts) {
    const text = String(opts && opts.text || '').trim();
    if (!text) throw new Error('task text required');
    return {
      task: text,
      context: {
        source: 'city-web',
        district: opts.districtId || null,
        building: opts.templateId || null,
        slot: opts.slot || null,
        agentId: opts.agentId || null
      }
    };
  }

  /* Normalize a gateway task record into a receipt view model. */
  function normalizeTask(rec) {
    if (!rec || typeof rec !== 'object') return null;
    return {
      id: rec.task_id || rec.id || rec.mission_id || null,
      status: rec.status || 'unknown',
      task: rec.task || '',
      startedAt: rec.startedAt || null,
      completedAt: rec.completedAt || null,
      receiptId: rec.receipt && rec.receipt.receipt_id ? rec.receipt.receipt_id : null,
      error: rec.error || null,
      result: rec.result != null ? rec.result : null
    };
  }


  /* --- live map: deterministic layout, activity derivation, agent placement ---
     Presentation geometry only. Positions come from the canonical manifest and
     PROVEN state (roster seating, running tasks). Nothing here invents motion:
     an agent token moves only while evidence says a task is running. */

  const MAP = { cols: 3, cellW: 310, cellH: 218, gap: 14, margin: 10, plazaH: 46 };

  /* Lay districts on a fixed grid, buildings stacked inside their district cell.
     Every building gets a work point (where a busy agent stands) and per-slot
     desk points (where a seated idle agent sits). */
  function layoutCity(model) {
    if (!model || !Array.isArray(model.districts)) throw new Error('city model required');
    const districts = model.districts.map((d, i) => {
      const col = i % MAP.cols, row = Math.floor(i / MAP.cols);
      const x = MAP.margin + col * (MAP.cellW + MAP.gap);
      const y = MAP.margin + row * (MAP.cellH + MAP.gap);
      const innerH = MAP.cellH - 30;
      const n = Math.max(1, d.buildings.length);
      const bh = Math.floor((innerH - (n - 1) * 8) / n);
      const buildings = d.buildings.map((b, j) => {
        const bx = x + 8, by = y + 24 + j * (bh + 8), bw = MAP.cellW - 16;
        const slotPoints = {};
        b.slots.forEach((s, k) => {
          // 2-wide desks with 64px gutters keep token name labels from overlapping
          slotPoints[s] = { x: bx + 34 + (k % 2) * 64, y: by + bh - 18 - Math.floor(k / 2) * 30 };
        });
        return {
          key: d.id + '/' + b.templateId,
          templateId: b.templateId, label: b.label, floorStyle: b.floorStyle,
          x: bx, y: by, w: bw, h: bh,
          workPoint: { x: bx + bw - 26, y: by + 22 },
          slotPoints
        };
      });
      return { id: d.id, label: d.label, x, y, w: MAP.cellW, h: MAP.cellH, buildings };
    });
    const rows = Math.ceil(districts.length / MAP.cols);
    const width = MAP.margin * 2 + MAP.cols * MAP.cellW + (MAP.cols - 1) * MAP.gap;
    const height = MAP.margin * 2 + rows * MAP.cellH + (rows - 1) * MAP.gap + MAP.plazaH;
    const plaza = { x: MAP.margin, y: height - MAP.plazaH + 8, w: width - MAP.margin * 2, h: MAP.plazaH - 16 };
    return { width, height, districts, plaza };
  }

  function findBuilding(layout, templateId) {
    for (const d of layout.districts) {
      const b = d.buildings.find(bb => bb.templateId === templateId);
      if (b) return b;
    }
    return null;
  }

  const ACTIVE_STATUSES = { running: 1, in_progress: 1, active: 1, queued: 1, pending: 1 };

  /* Merge proven activity into one map: gateway missions (any device) plus tasks
     sent from this surface. Only active/running entries move a token. Routing
     metadata must be present — without it we honestly cannot place the work. */
  function deriveActivity(opts) {
    const out = { byAgent: {}, byBuilding: {}, entries: [] };
    const push = (e) => {
      if (!e || !e.templateId) return;
      out.entries.push(e);
      out.byBuilding[e.templateId] = (out.byBuilding[e.templateId] || 0) + 1;
      if (e.agentId) out.byAgent[e.agentId] = e;
      else if (e.slot) out.bySlot = Object.assign(out.bySlot || {}, { [e.templateId + '/' + e.slot]: e });
    };
    const tasks = (opts && Array.isArray(opts.tasks)) ? opts.tasks : [];
    for (const t of tasks) {
      if (!t || !ACTIVE_STATUSES[String(t.status || '').toLowerCase()]) continue;
      const r = t.routing || (t.context && { districtId: t.context.district, templateId: t.context.building, slot: t.context.slot, agentId: t.context.agentId }) || {};
      push({ taskId: t.id || t.task_id || null, agentId: r.agentId || null, slot: r.slot || null, districtId: r.districtId || null, templateId: r.templateId || null, label: t.task || '', source: 'task' });
    }
    const missions = (opts && Array.isArray(opts.missions)) ? opts.missions : [];
    for (const m of missions) {
      if (!m || typeof m !== 'object') continue;
      if (!ACTIVE_STATUSES[String(m.status || 'running').toLowerCase()]) continue;
      const c = m.context || m.routing || {};
      push({ taskId: m.id || m.task_id || null, agentId: m.agentId || c.agentId || null, slot: c.slot || null, districtId: c.district || c.districtId || null, templateId: c.building || c.templateId || null, label: m.task || m.title || '', source: 'mission' });
    }
    return out;
  }

  /* Place every roster citizen on the map. Seated citizens get the desk point of
     their proven slot; a running task with routing moves them to that building's
     work point. Unassigned roster citizens gather in the plaza — present, but
     honestly not seated. */
  function agentPlacements(model, layout, seating, activity, citizens) {
    const placed = [];
    const seen = new Set();
    for (const entry of flattenSlots(model)) {
      const c = seating && seating.seating ? seating.seating[entry.districtId + '/' + entry.templateId + '/' + entry.slot] : null;
      if (!c) continue;
      const b = findBuilding(layout, entry.templateId);
      if (!b) continue;
      const id = c.id || c.agentId || c.name;
      seen.add(id);
      const home = b.slotPoints[entry.slot] || { x: b.x + 20, y: b.y + b.h - 14 };
      const act = activity && (activity.byAgent[id] || (activity.bySlot && activity.bySlot[entry.templateId + '/' + entry.slot]));
      placed.push({
        agentId: id, name: c.name || id, role: c.role || entry.slot,
        slot: entry.slot, districtId: entry.districtId, templateId: entry.templateId,
        x: act ? b.workPoint.x : home.x, y: act ? b.workPoint.y : home.y,
        home, working: !!act, taskLabel: act ? act.label : null, taskId: act ? act.taskId : null,
        seated: true
      });
    }
    const unassigned = (seating && Array.isArray(seating.unassigned)) ? seating.unassigned : [];
    unassigned.forEach((c, i) => {
      const id = c.id || c.agentId || c.name || ('unassigned-' + i);
      if (seen.has(id)) return;
      seen.add(id);
      placed.push({
        agentId: id, name: c.name || id, role: c.role || 'agent',
        slot: null, districtId: c.district || null, templateId: null,
        x: layout.plaza.x + 24 + (i % 12) * 30, y: layout.plaza.y + 14 + Math.floor(i / 12) * 20,
        home: null, working: false, taskLabel: null, taskId: null,
        seated: false
      });
    });
    return placed;
  }

  /* Which agents changed position between two placement arrays. */
  function diffPlacements(prev, next) {
    const before = {};
    (prev || []).forEach(p => { before[p.agentId] = p.x + ',' + p.y; });
    const moved = [];
    (next || []).forEach(p => {
      if (before[p.agentId] !== undefined && before[p.agentId] !== p.x + ',' + p.y) moved.push(p.agentId);
    });
    return moved;
  }

  /* WALK PATH - the visible route between two evidenced positions (desk -> work point
     and back). Pure geometry: endpoints are ALWAYS the evidenced positions exactly; a
     single perpendicular bend turns the straight line into a readable walking arc.
     The browser animates along this path so a real task reads as an agent WALKING,
     never teleporting. Pure + unit-tested. */
  function walkPath(from, to) {
    if (!from || !to || !isFinite(+from.x) || !isFinite(+from.y) || !isFinite(+to.x) || !isFinite(+to.y)) return [];
    const fx = +from.x, fy = +from.y, tx = +to.x, ty = +to.y;
    if (fx === tx && fy === ty) return [{ x: fx, y: fy }];
    const dx = tx - fx, dy = ty - fy;
    const len = Math.hypot(dx, dy);
    const off = Math.min(26, len * 0.18);
    const mid = { x: Math.round((fx + tx) / 2 - (dy / len) * off), y: Math.round((fy + ty) / 2 + (dx / len) * off) };
    return [{ x: fx, y: fy }, mid, { x: tx, y: ty }];
  }

  /* GATEWAY ACTIVITY FEED — the same activeTasks the map moves on, normalized for
     the TASKS & RECEIPTS panel so EVERY viewer sees current/recent gateway work and
     its receipts, not only tasks sent from their own device. Newest first, capped.
     Statuses are the gateway's own words (running/accepted/failed) - verbatim, never
     dressed up. Pure + unit-tested. */
  function activityFeed(status, cap) {
    const raw = (status && Array.isArray(status.activeTasks)) ? status.activeTasks : [];
    const items = raw.map(t => ({
      id: t.event || null,                       // opaque public event id, never an internal id
      status: String(t.state || 'unknown'),
      label: String(t.summary || ''),
      agent: t.agent || null,
      receipted: t.receipt === true,
      startedAgoMin: (typeof t.startedAgoMin === 'number') ? t.startedAgoMin : null,
      settledAgoMin: (typeof t.settledAgoMin === 'number') ? t.settledAgoMin : null
    }));
    items.sort((a, b) => (a.startedAgoMin == null ? 1e9 : a.startedAgoMin) - (b.startedAgoMin == null ? 1e9 : b.startedAgoMin));
    return items.slice(0, cap || 20);
  }


  /* WORLD SPAWN PLAN — the deterministic display identity for the 2D world view.
     Hero = the orchestrator (id 'agent') when present, else the first citizen; the
     hero takes the 'heisenberg' sprite set ONLY when it literally is Heisenberg
     (the skin exists for that character); everyone else draws from the neutral
     blank-* pool in roster order. Skins are presentation only — the roster is the
     backend truth and carries no skins, so nothing here invents backend state. */
  const WORLD_SKIN_POOL = ['blank_blue', 'blank_green', 'blank_red', 'blank_amber', 'blank'];
  function worldSpawnPlan(citizens) {
    // public DTO citizens have no internal ids: the roster NAME is the body's identity
    const list = (Array.isArray(citizens) ? citizens : []).filter(c => c && c.name);
    const hi = list.findIndex(c => c.hero === true || c.role === 'orchestrator');
    const ordered = hi > 0 ? [list[hi]].concat(list.slice(0, hi), list.slice(hi + 1)) : list;
    let pool = 0;
    return ordered.map((c, i) => {
      const hero = i === 0;
      const skin = (hero && String(c.name).toUpperCase() === 'HEISENBERG') ? 'heisenberg' : WORLD_SKIN_POOL[(pool++) % WORLD_SKIN_POOL.length];
      return { id: String(c.name), name: String(c.name), hero, skin };
    });
  }

  /* WORLD ACTIVITY DIFF — maps the gateway's own activeTasks onto world bodies.
     A body works iff the gateway shows a RUNNING task whose context.agentId names it.
     Pure: takes the previous applied map, returns only the changes to apply
     ({id, kind:'task'|'idle'}) so the driver never re-seizes a working body and
     never fabricates movement the gateway did not report. */
  function worldWorkSet(status) {
    const out = new Set();
    const tasks = (status && Array.isArray(status.activeTasks)) ? status.activeTasks : [];
    for (const t of tasks) {
      // the DTO binds work by the agent's PUBLIC roster name; bodies spawn under that name
      if (t && t.state === 'running' && t.agent) out.add(String(t.agent));
    }
    return out;
  }
  function worldActivityDiff(prev, status, knownIds) {
    const want = worldWorkSet(status);
    const changes = [];
    const ids = new Set([].concat(Object.keys(prev || {}), Array.from(knownIds || []), Array.from(want)));
    for (const id of ids) {
      const before = !!(prev && prev[id]);
      const after = want.has(id);
      if (before !== after) changes.push({ id, kind: after ? 'task' : 'idle' });
    }
    return changes;
  }


  /* OCCUPIED ROOM FRAME — which room the agents are BOUND to (desk/bay prop.agentId),
     not where bodies happen to be standing at camera time. Transient spawn clustering
     otherwise frames the empty spawn hab; bay bindings are the honest occupancy signal.
     Densest bound room wins; ties go to the hero's room. Pure. */
  function occupiedRoomFrame(rooms, props, tile) {
    const T = tile || 12;
    const rects = (rooms && typeof rooms === 'object' ? Object.values(rooms) : [])
      .filter(r => r && Array.isArray(r.rects) && r.rects.length)
      .map(r => ({ id: r.id, name: r.name, rect: r.rects[0] }))
      .filter(r => r.rect && isFinite(r.rect.x1));
    if (!rects.length) return null;
    const counts = new Map(rects.map(r => [r.id, 0]));
    let heroRoom = null;
    for (const p of (Array.isArray(props) ? props : [])) {
      if (!p || !p.agentId || !isFinite(p.x) || !isFinite(p.y)) continue;
      for (const r of rects) {
        const q = r.rect;
        if (p.x >= q.x1 && p.x <= q.x2 + 1 && p.y >= q.y1 && p.y <= q.y2 + 1) {
          counts.set(r.id, counts.get(r.id) + 1);
          if (String(p.agentId).toUpperCase() === 'HEISENBERG') heroRoom = r.id;
          break;
        }
      }
    }
    let best = rects[0], bestN = -1;
    for (const r of rects) {
      const n = counts.get(r.id);
      if (n > bestN || (n === bestN && r.id === heroRoom)) { best = r; bestN = n; }
    }
    const q = best.rect;
    return {
      room: best.id, name: best.name || best.id, count: counts.get(best.id),
      cx: ((q.x1 + q.x2 + 1) / 2) * T, cy: ((q.y1 + q.y2 + 1) / 2) * T
    };
  }

  /* OCCUPIED FRAME — bounding box (world pixels) around every placed agent body, padded, so
     the web surface can open the camera on the occupied buildings and visible agents instead
     of the empty architecture. Pure: snapshots in, rect or null out. */
  function occupiedFrame(snaps, pad) {
    const pts = (Array.isArray(snaps) ? snaps : []).filter(snap => snap && snap.placed && isFinite(snap.x) && isFinite(snap.y));
    if (!pts.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const pt of pts) {
      if (pt.x < x0) x0 = pt.x;
      if (pt.y < y0) y0 = pt.y;
      if (pt.x > x1) x1 = pt.x;
      if (pt.y > y1) y1 = pt.y;
    }
    const m = (typeof pad === 'number') ? pad : 60;
    return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m, count: pts.length };
  }

  return { cityModel, flattenSlots, classifyStatus, seatCitizens, buildTaskPayload, normalizeTask, layoutCity, deriveActivity, agentPlacements, diffPlacements, activityFeed, walkPath, worldSpawnPlan, worldWorkSet, worldActivityDiff, occupiedFrame, occupiedRoomFrame, WORLD_SKIN_POOL, MAP };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CityCore;
