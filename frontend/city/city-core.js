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
  function classifyStatus(payload) {
    if (!payload || typeof payload !== 'object') return { mode: 'offline', label: 'No live state', citizens: [], missions: [], approvals: [] };
    const citizens = Array.isArray(payload.citizens) ? payload.citizens : [];
    const missions = Array.isArray(payload.missions) ? payload.missions : [];
    const approvals = Array.isArray(payload.approvals) ? payload.approvals : [];
    if (payload.degraded) return { mode: 'degraded', label: 'Backend unreachable — no live state', citizens, missions, approvals };
    const ok = payload.health && payload.health.status === 'online';
    return ok
      ? { mode: 'live', label: 'Live', citizens, missions, approvals, generatedAt: payload.generatedAt || null }
      : { mode: 'degraded', label: 'Backend degraded', citizens, missions, approvals, generatedAt: payload.generatedAt || null };
  }

  /* Seat live citizens into canonical slots by specialty/role match. Unmatched
     slots stay vacancies; citizens that match no slot are listed as unassigned.
     A roster name is not proof of activity — 'seated' means present in roster only. */
  function seatCitizens(model, citizens) {
    const roster = Array.isArray(citizens) ? citizens.slice() : [];
    const used = new Set();
    const seating = {};
    for (const entry of flattenSlots(model)) {
      const key = entry.districtId + '/' + entry.templateId + '/' + entry.slot;
      const idx = roster.findIndex((c, i) => {
        if (used.has(i)) return false;
        const spec = String(c.specialtyId || c.specialty || '').toLowerCase();
        const role = String(c.role || '').toLowerCase();
        return spec === entry.slot || role === entry.slot;
      });
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

  return { cityModel, flattenSlots, classifyStatus, seatCitizens, buildTaskPayload, normalizeTask };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CityCore;
