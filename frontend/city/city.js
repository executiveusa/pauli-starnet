/* Pauli's Place — city web surface OVERLAY. The 2D world (city-world.js + world.js) is the
 * primary view; this owns the secondary, CLOSED-BY-DEFAULT panel: gateway status line and the
 * all-viewers activity feed with receipts. This surface is PUBLIC and READ-ONLY: no token
 * field, no task sending, no approvals — the Netlify function refuses every write anyway.
 * Truth rules: no gateway = no claimed activity; statuses are the gateway's own words. */
'use strict';
(function () {
  const $ = (sel, el) => (el || document).querySelector(sel);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const POLL_MS = 5000;

  const DEFAULT_GW = '/.netlify/functions/gw';
  const state = {
    model: null,
    mode: 'offline',
    gatewayUrl: DEFAULT_GW,   // fixed: visitors can never point this page at another backend
    status: null,
    timer: null
  };
  const subs = [];

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
      const r = await fetch(state.gatewayUrl + '/v1/city/status', { cache: 'no-store' });
      if (r.status === 404 && state.gatewayUrl === DEFAULT_GW) { setMode('offline', 'Not connected — no live state.'); return; }
      if (r.status === 502 || r.status === 503) { setMode('degraded', 'City backend starting or unreachable.'); return; }
      if (!r.ok) { setMode('degraded', 'Gateway error ' + r.status); return; }
      const payload = await r.json();
      const c = CityCore.classifyStatus(payload);
      state.status = c;
      setMode(c.mode, c.label + (c.generatedAt ? ' · ' + new Date(c.generatedAt).toLocaleTimeString() : ''));
      renderFeed(); renderLastAct();
      for (const fn of subs) { try { fn(c); } catch (_) {} }
      if (window.CityWorld && window.CityWorld.applyStatus) { try { window.CityWorld.applyStatus(c); } catch (_) {} }
    } catch (_) {
      setMode('degraded', 'Gateway unreachable from this device.');
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

  function boot() {
    if (typeof CityOS !== 'undefined' && typeof CityCore !== 'undefined') {
      state.model = CityCore.cityModel(CityOS);
      $('#cityname').textContent = state.model.name;
      $('#counts').textContent = state.model.counts.districts + ' districts · ' + state.model.counts.buildings + ' buildings · ' + state.model.counts.slots + ' specialist slots';
    }
    setMode('offline', 'Connecting…');
    $('#whole-city').addEventListener('click', () => { try { if (typeof World !== 'undefined' && World.refit) World.refit(); } catch (_) {} });
    $('#feed-toggle').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
    $('#panel-close').addEventListener('click', () => document.body.classList.add('panel-hidden'));
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') document.body.classList.add('panel-hidden'); });
    poll();
    state.timer = setInterval(poll, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
