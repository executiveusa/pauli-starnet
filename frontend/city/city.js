/* Pauli's Place — city web surface. Renders the canonical CityOS manifest, polls the
 * Pauli gateway for live state, and sends tasks to Heisenberg for district specialists.
 * Truth rules: no gateway = no claimed activity. Demo mode is labeled as demo. */
'use strict';
(function () {
  const $ = (sel, el) => (el || document).querySelector(sel);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const LS = { gateway: 'pauli.city.gatewayUrl', token: 'pauli.city.gatewayToken' };
  const POLL_MS = 5000;

  const params = new URLSearchParams(location.search);
  // Default path is the same-origin Netlify function proxy: the gateway token lives
  // server-side, never in this browser. Settings can override with a direct gateway
  // URL + bearer token for owner use.
  const DEFAULT_GW = '/.netlify/functions/gw';
  const state = {
    model: null,
    mode: 'offline',          // live | degraded | offline | demo
    gatewayUrl: params.get('gateway') || localStorage.getItem(LS.gateway) || DEFAULT_GW,
    token: localStorage.getItem(LS.token) || '',
    status: null,
    seating: null,
    tasks: [],                // local view of dispatched task ids
    timer: null,
    layout: null,             // deterministic map geometry from the canonical model
    activity: { byAgent: {}, byBuilding: {}, entries: [] },
    tokenEls: {},             // agentId -> <g> token element (kept so moves animate)
    mapReady: false
  };
  if (params.get('gateway')) localStorage.setItem(LS.gateway, state.gatewayUrl);

  function setMode(mode, label) {
    state.mode = mode;
    const dot = $('#dot'), line = $('#statusline');
    dot.className = 'dot ' + (mode === 'live' ? 'live' : mode === 'offline' ? 'offline' : 'degraded');
    line.textContent = label;
  }

  async function poll() {
    if (!state.gatewayUrl) { setMode('offline', 'Not connected — canonical city plan only. No live state.'); return; }
    try {
      const r = await fetch(state.gatewayUrl.replace(/\/+$/, '') + '/v1/city/status', {
        headers: state.token ? { Authorization: 'Bearer ' + state.token } : {}, cache: 'no-store'
      });
      if (r.status === 401) { setMode('degraded', 'Gateway rejected the token.'); return; }
      if (r.status === 404 && state.gatewayUrl === DEFAULT_GW) { setMode('offline', 'Not connected — canonical city plan only. No live state.'); return; }
      if (r.status === 502 || r.status === 503) { setMode('degraded', 'City backend starting or unreachable.'); return; }
      if (!r.ok) { setMode('degraded', 'Gateway error ' + r.status); return; }
      const payload = await r.json();
      const c = CityCore.classifyStatus(payload);
      state.status = c;
      state.seating = CityCore.seatCitizens(state.model, c.citizens);
      setMode(c.mode, c.label + (c.generatedAt ? ' · ' + new Date(c.generatedAt).toLocaleTimeString() : ''));
      if (c.mode === 'live') { const ob = document.getElementById('offline-banner'); if (ob) ob.remove(); }
      updateActivity(c);
      renderCity(); renderApprovals();
    } catch (_) {
      setMode('degraded', 'Gateway unreachable from this device.');
    }
  }

  function slotAgent(entry) {
    if (!state.seating) return null;
    return state.seating.seating[entry.districtId + '/' + entry.templateId + '/' + entry.slot] || null;
  }


  /* --- live map -----------------------------------------------------------
     One SVG: districts and buildings from the canonical manifest (static
     shell), roster citizens as tokens. A token's position is PROOF-SHAPED:
     the desk of its seated slot, or the work point of a building while the
     gateway shows a real running task routed there. Movement between those
     two proven states is a CSS transition on the token's transform — the
     animation only ever plays between two evidenced positions. */

  const SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, text) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function renderMapShell() {
    const host = $('#map');
    host.textContent = '';
    state.tokenEls = {};
    const L = state.layout;
    const svg = svgEl('svg', { viewBox: '0 0 ' + L.width + ' ' + L.height, role: 'img', 'aria-label': 'Live map of the city districts, buildings, and agents' });
    for (const d of L.districts) {
      svg.appendChild(svgEl('rect', { class: 'map-district', x: d.x, y: d.y, width: d.w, height: d.h, rx: 10 }));
      svg.appendChild(svgEl('text', { class: 'map-district-label', x: d.x + 8, y: d.y + 15 }, d.label));
      for (const b of d.buildings) {
        svg.appendChild(svgEl('rect', { class: 'map-building b-' + b.floorStyle, id: 'mapb-' + b.templateId, x: b.x, y: b.y, width: b.w, height: b.h, rx: 6 }));
        svg.appendChild(svgEl('text', { class: 'map-building-label', x: b.x + 7, y: b.y + 14 }, b.label));
      }
    }
    svg.appendChild(svgEl('rect', { class: 'map-plaza', x: L.plaza.x, y: L.plaza.y, width: L.plaza.w, height: L.plaza.h, rx: 6 }));
    svg.appendChild(svgEl('text', { class: 'map-plaza-label', x: L.plaza.x + 8, y: L.plaza.y + 13 }, 'ROSTERED, NOT SEATED'));
    svg.appendChild(svgEl('g', { id: 'tokens' }));
    host.appendChild(svg);
    state.mapReady = true;
  }

  function updateActivity(c) {
    const missions = ((c && c.missions) || []).concat((c && c.activeTasks) || []);
    state.activity = CityCore.deriveActivity({ missions, tasks: state.tasks });
    updateTokens();
  }

  function updateTokens() {
    if (!state.mapReady) return;
    const layer = $('#tokens');
    if (!layer) return;
    const placements = state.seating
      ? CityCore.agentPlacements(state.model, state.layout, state.seating, state.activity)
      : [];
    const alive = new Set();
    for (const p of placements) {
      alive.add(p.agentId);
      let t = state.tokenEls[p.agentId];
      if (!t) {
        t = svgEl('g', { class: 'token' + (p.seated ? '' : ' unseated') });
        t.appendChild(svgEl('circle', { r: 7 }));
        const label = svgEl('text', { y: -11 }, p.name);
        t.appendChild(label);
        t.appendChild(svgEl('title', null, p.name + (p.seated ? ' — ' + (p.slot || p.role) : ' — rostered, not seated')));
        layer.appendChild(t);
        state.tokenEls[p.agentId] = t;
        // first placement: no slide-in from 0,0 — place instantly
        t.style.transition = 'none';
        t.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
        t.getBoundingClientRect(); // commit before re-enabling the transition
        t.style.transition = '';
      } else {
        t.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
      }
      t.classList.toggle('working', !!p.working);
      const title = t.querySelector('title');
      if (title) title.textContent = p.name + (p.working ? ' — working: ' + (p.taskLabel || 'task running') : (p.seated ? ' — at desk (' + (p.slot || p.role) + ')' : ' — rostered, not seated'));
    }
    for (const id in state.tokenEls) {
      if (!alive.has(id)) { state.tokenEls[id].remove(); delete state.tokenEls[id]; }
    }
  }

  function flashBuilding(templateId, ok) {
    const rect = document.getElementById('mapb-' + templateId);
    if (!rect) return;
    rect.classList.remove('flash-ok', 'flash-bad');
    void rect.getBoundingClientRect();
    rect.classList.add(ok ? 'flash-ok' : 'flash-bad');
    setTimeout(() => rect.classList.remove('flash-ok', 'flash-bad'), 4200);
  }

  const TASKABLE = { commerce_factory: true, connector_exchange: true };

  function renderCity() {
    const root = $('#city');
    root.textContent = '';
    for (const d of state.model.districts) {
      const dsec = el('section', 'district');
      dsec.appendChild(el('h2', null, d.label));
      const grid = el('div', 'buildings');
      for (const b of d.buildings) {
        const card = el('div', 'building b-' + b.floorStyle);
        card.appendChild(el('h3', null, b.label));
        card.appendChild(el('div', 'caps', b.caps.join(' · ') + (b.connectorPorts ? ' · ' + b.connectorPorts + ' connector ports' : '')));
        const slots = el('div', 'slots');
        for (const s of b.slots) {
          const entry = { districtId: d.id, templateId: b.templateId, slot: s };
          const agent = slotAgent(entry);
          const row = el('div', 'slot');
          const who = el('span', 'who');
          if (agent) { who.textContent = agent.name || agent.id; row.appendChild(el('span', 'dot live')); }
          else { who.appendChild(el('span', 'vacant', 'vacancy')); }
          row.appendChild(who);
          row.appendChild(el('span', 'spec', s));
          if (TASKABLE[b.templateId]) {
            const btn = el('button', null, 'Task');
            btn.addEventListener('click', () => openTaskDialog(d, b, s, agent));
            row.appendChild(btn);
          }
          slots.appendChild(row);
        }
        card.appendChild(slots);
        grid.appendChild(card);
      }
      dsec.appendChild(grid);
      root.appendChild(dsec);
    }
  }

  function renderApprovals() {
    const list = $('#approvals-list');
    list.textContent = '';
    const approvals = (state.status && state.status.approvals) || [];
    if (!approvals.length) { list.appendChild(el('div', 'note', state.mode === 'live' ? 'Nothing waiting on you.' : 'Unknown — no live connection.')); return; }
    for (const a of approvals) {
      const row = el('div', 'taskrow');
      row.appendChild(el('div', null, a.title || 'Pending action'));
      row.appendChild(el('div', 'meta', (a.district ? a.district + ' · ' : '') + 'risk: ' + (a.risk || 'unknown') + (a.cost != null ? ' · est. cost: ' + a.cost : '')));
      list.appendChild(row);
    }
  }

  function renderTasks() {
    const list = $('#tasks-list');
    list.textContent = '';
    if (!state.tasks.length) { list.appendChild(el('div', 'note', 'No tasks sent from this device yet.')); return; }
    for (const t of state.tasks.slice().reverse()) {
      const row = el('div', 'taskrow');
      const head = el('div');
      head.appendChild(el('span', 'pill ' + (t.status === 'completed' ? 'completed' : t.status === 'failed' ? 'failed' : 'running'), t.status));
      head.appendChild(document.createTextNode(' ' + (t.task || '')));
      row.appendChild(head);
      const meta = [];
      if (t.receiptId) meta.push('receipt ' + t.receiptId);
      if (t.startedAt) meta.push(new Date(t.startedAt).toLocaleTimeString());
      if (t.error) meta.push('error: ' + t.error);
      row.appendChild(el('div', 'meta', meta.join(' · ') || 'waiting for first update'));
      list.appendChild(row);
    }
  }

  async function refreshTask(t) {
    if (!state.gatewayUrl || !t.id) return;
    try {
      const r = await fetch(state.gatewayUrl.replace(/\/+$/, '') + '/v1/heisenberg/tasks/' + encodeURIComponent(t.id), {
        headers: state.token ? { Authorization: 'Bearer ' + state.token } : {}, cache: 'no-store'
      });
      if (!r.ok) return;
      const wasRunning = t.status === 'running';
      const rec = CityCore.normalizeTask(await r.json());
      if (rec) Object.assign(t, rec);
      renderTasks();
      if (wasRunning && t.status !== 'running') {
        if (t.context && t.context.building) flashBuilding(t.context.building, t.status === 'completed');
        updateActivity(state.status);
      }
      if (t.status === 'running') setTimeout(() => refreshTask(t), 3000);
    } catch (_) { /* keep last known state */ }
  }

  function openTaskDialog(d, b, slot, agent) {
    if (state.mode !== 'live') { alert('The city backend is not live yet. Tasks need a running gateway.'); return; }
    const dlg = $('#taskdialog');
    $('#taskdialog h3').textContent = 'Task — ' + b.label + ' / ' + slot;
    $('#task-target').textContent = agent
      ? 'Routed to ' + (agent.name || agent.id) + ' through Heisenberg.'
      : 'No seated specialist — Heisenberg routes or summons within the ' + d.label + '.';
    $('#task-text').value = '';
    dlg.dataset.payload = JSON.stringify({ districtId: d.id, templateId: b.templateId, slot, agentId: agent ? (agent.id || null) : null });
    dlg.showModal();
  }

  async function sendTask() {
    const dlg = $('#taskdialog');
    const meta = JSON.parse(dlg.dataset.payload || '{}');
    let payload;
    try { payload = CityCore.buildTaskPayload(Object.assign(meta, { text: $('#task-text').value })); }
    catch (e) { alert(e.message); return; }
    const btn = $('#task-send');
    btn.disabled = true;
    try {
      const r = await fetch(state.gatewayUrl.replace(/\/+$/, '') + '/v1/heisenberg/tasks', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, state.token ? { Authorization: 'Bearer ' + state.token } : {}),
        body: JSON.stringify(payload)
      });
      if (!r.ok) { alert('Gateway refused the task (' + r.status + ').'); return; }
      const rec = CityCore.normalizeTask(await r.json());
      if (rec) {
        rec.context = payload.context; // routing metadata we sent — the gateway does not echo it back
        state.tasks.push(rec); renderTasks();
        updateActivity(state.status);
        setTimeout(() => refreshTask(state.tasks[state.tasks.length - 1]), 3000);
      }
      dlg.close();
    } catch (_) { alert('Task send failed — gateway unreachable.'); }
    finally { btn.disabled = false; }
  }

  function openSettings() {
    const dlg = $('#settings');
    $('#set-gateway').value = state.gatewayUrl;
    $('#set-token').value = state.token;
    dlg.showModal();
  }

  function saveSettings() {
    state.gatewayUrl = $('#set-gateway').value.trim();
    state.token = $('#set-token').value.trim();
    localStorage.setItem(LS.gateway, state.gatewayUrl);
    localStorage.setItem(LS.token, state.token);
    $('#settings').close();
    poll();
  }

  function boot() {
    if (typeof CityOS === 'undefined') { document.body.innerHTML = '<p style="padding:20px">CityOS manifest failed to load.</p>'; return; }
    state.model = CityCore.cityModel(CityOS);
    state.layout = CityCore.layoutCity(state.model);
    renderMapShell();
    $('#cityname').textContent = state.model.name;
    $('#counts').textContent = state.model.counts.districts + ' districts · ' + state.model.counts.buildings + ' buildings · ' + state.model.counts.slots + ' specialist slots';
    renderCity(); renderTasks(); renderApprovals();

    if (params.get('demo') === '1') {
      const b = el('div', 'banner demo', 'DEMO MODE — sample data, not the live city.');
      document.body.insertBefore(b, $('main'));
      setMode('degraded', 'Demo mode');
      state.seating = CityCore.seatCitizens(state.model, [
        { id: 'heisenberg', name: 'Heisenberg', role: 'orchestrator', status: 'online' },
        { id: 'ecom-operator', name: 'Commerce Operator', specialtyId: 'operator', status: 'online' },
        { id: 'ecom-treasurer', name: 'Commerce Treasurer', specialtyId: 'treasurer', status: 'online' }
      ]);
      renderCity();
      return;
    }

    const banner = el('div', 'banner', 'Not connected to the city backend — this is the canonical city plan, not live state. Open Settings to point at the gateway.');
    banner.id = 'offline-banner';
    document.body.insertBefore(banner, $('main'));
    setMode('offline', 'Not connected');
    $('#settings-btn').addEventListener('click', openSettings);
    $('#settings-save').addEventListener('click', saveSettings);
    $('#task-send').addEventListener('click', sendTask);
    poll();
    state.timer = setInterval(poll, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
