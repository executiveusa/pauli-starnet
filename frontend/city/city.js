/* Pauli's Place — city web surface OVERLAY. The 2D world (city-world.js + world.js) is the
 * primary view; this owns the secondary panel: gateway status line, the all-viewers activity
 * feed with receipts, task sending to Heisenberg, and approvals. Truth rules: no gateway = no
 * claimed activity; statuses are the gateway's own words. */
'use strict';
(function () {
  const $ = (sel, el) => (el || document).querySelector(sel);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const LS = { gateway: 'pauli.city.gatewayUrl', token: 'pauli.city.gatewayToken' };
  const POLL_MS = 5000;

  const params = new URLSearchParams(location.search);
  const DEFAULT_GW = '/.netlify/functions/gw';
  const state = {
    model: null,
    mode: 'offline',
    gatewayUrl: params.get('gateway') || localStorage.getItem(LS.gateway) || DEFAULT_GW,
    token: localStorage.getItem(LS.token) || '',
    status: null,
    tasks: [],
    timer: null
  };
  const subs = [];
  if (params.get('gateway')) localStorage.setItem(LS.gateway, state.gatewayUrl);

  window.CitySurface = {
    latest: () => state.status,
    onStatus: fn => { if (typeof fn === 'function') subs.push(fn); }
  };

  function setMode(mode, label) {
    state.mode = mode;
    const dot = $('#dot'), line = $('#statusline');
    dot.className = 'dot ' + (mode === 'live' ? 'live' : mode === 'offline' ? 'offline' : 'degraded');
    line.textContent = label;
  }

  async function poll() {
    if (!state.gatewayUrl) { setMode('offline', 'Not connected — no live state.'); return; }
    try {
      const r = await fetch(state.gatewayUrl.replace(/\/+$/, '') + '/v1/city/status', {
        headers: state.token ? { Authorization: 'Bearer ' + state.token } : {}, cache: 'no-store'
      });
      if (r.status === 401) { setMode('degraded', 'Gateway rejected the token.'); return; }
      if (r.status === 404 && state.gatewayUrl === DEFAULT_GW) { setMode('offline', 'Not connected — no live state.'); return; }
      if (r.status === 502 || r.status === 503) { setMode('degraded', 'City backend starting or unreachable.'); return; }
      if (!r.ok) { setMode('degraded', 'Gateway error ' + r.status); return; }
      const payload = await r.json();
      const c = CityCore.classifyStatus(payload);
      state.status = c;
      setMode(c.mode, c.label + (c.generatedAt ? ' · ' + new Date(c.generatedAt).toLocaleTimeString() : ''));
      renderFeed(); renderLastAct(); renderApprovals();
      for (const fn of subs) { try { fn(c); } catch (_) {} }
      if (window.CityWorld && window.CityWorld.applyStatus) { try { window.CityWorld.applyStatus(c); } catch (_) {} }
    } catch (_) {
      setMode('degraded', 'Gateway unreachable from this device.');
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

  function renderFeed() {
    // GATEWAY ACTIVITY — current/recent activeTasks verbatim from the gateway, with receipts,
    // shown to EVERY viewer. This is what makes real work visible at idle moments.
    const list = $('#gw-feed');
    if (!list) return;
    list.textContent = '';
    const items = CityCore.activityFeed(state.status, 10);
    if (!items.length) { list.appendChild(el('div', 'note', 'No gateway activity recorded yet.')); return; }
    for (const t of items) {
      const row = el('div', 'taskrow');
      const head = el('div');
      head.appendChild(el('span', 'pill ' + (t.status === 'completed' || t.status === 'accepted' ? 'completed' : t.status === 'failed' ? 'failed' : 'running'), t.status));
      head.appendChild(document.createTextNode(' ' + (t.label || '').slice(0, 140)));
      row.appendChild(head);
      const meta = [];
      if (t.receiptId) meta.push('receipt ' + t.receiptId);
      if (t.startedAt) meta.push(new Date(t.startedAt).toLocaleTimeString());
      if (t.completedAt) meta.push('settled ' + new Date(t.completedAt).toLocaleTimeString());
      row.appendChild(el('div', 'meta', meta.join(' · ')));
      list.appendChild(row);
    }
  }

  function renderLastAct() {
    const n = $('#lastact');
    if (!n) return;
    const items = CityCore.activityFeed(state.status, 1);
    if (!items.length) { n.textContent = ''; return; }
    const t = items[0];
    const when = t.completedAt || t.startedAt;
    const ago = when ? Math.max(0, Math.round((Date.now() - new Date(when).getTime()) / 60000)) : null;
    n.textContent = ' — last gateway activity: ' + t.status + (ago != null ? ' · ' + (ago < 1 ? 'just now' : ago + ' min ago') : '');
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
      const rec = CityCore.normalizeTask(await r.json());
      if (rec) Object.assign(t, rec);
      renderTasks();
      if (t.status === 'running') setTimeout(() => refreshTask(t), 3000);
    } catch (_) { /* keep last known state */ }
  }

  function openTaskDialog() {
    if (state.mode !== 'live') { alert('The city backend is not live yet. Tasks need a running gateway.'); return; }
    const dlg = $('#taskdialog');
    $('#task-target').textContent = 'Routed to HEISENBERG, the city orchestrator.';
    $('#task-text').value = '';
    dlg.dataset.payload = JSON.stringify({ districtId: 'command', templateId: 'executive_hq', slot: 'orchestrator', agentId: 'agent' });
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
        rec.context = payload.context;
        state.tasks.push(rec); renderTasks();
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
    if (window.CityWorld && window.CityWorld.bootWorld) window.CityWorld.bootWorld();
  }

  function boot() {
    if (typeof CityOS !== 'undefined' && typeof CityCore !== 'undefined') {
      state.model = CityCore.cityModel(CityOS);
      $('#cityname').textContent = state.model.name;
      $('#counts').textContent = state.model.counts.districts + ' districts · ' + state.model.counts.buildings + ' buildings · ' + state.model.counts.slots + ' specialist slots';
    }
    renderTasks(); renderApprovals();
    setMode('offline', 'Connecting…');
    $('#settings-btn').addEventListener('click', openSettings);
    $('#settings-save').addEventListener('click', saveSettings);
    $('#task-send').addEventListener('click', sendTask);
    $('#task-open').addEventListener('click', openTaskDialog);
    $('#feed-toggle').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
    poll();
    state.timer = setInterval(poll, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
