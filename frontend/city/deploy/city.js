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
      setMode(c.mode, c.label + (c.generatedAgoMin != null ? (c.generatedAgoMin < 1 ? ' · just now' : ' · ' + c.generatedAgoMin + ' min ago') : ''));
      renderFeed(); renderLastAct(); renderChrome();
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
      if (t.agent) meta.push(t.agent);
      if (t.receipted) meta.push('receipted');
      if (t.startedAgoMin != null) meta.push(t.startedAgoMin < 1 ? 'just now' : t.startedAgoMin + ' min ago');
      if (t.settledAgoMin != null) meta.push('settled ' + (t.settledAgoMin < 1 ? 'just now' : t.settledAgoMin + ' min ago'));
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
    const ago = t.settledAgoMin != null ? t.settledAgoMin : t.startedAgoMin;
    n.textContent = ' — last gateway activity: ' + t.status + (ago != null ? ' · ' + (ago < 1 ? 'just now' : ago + ' min ago') : '');
  }

  /* ROUND-4 CONTROL CHROME — CAM ticker, header instruments, crew rail. Every value below is derived
     from the SAME public gateway DTO the activity feed uses (names, coarse category enums, relative
     ages, receipt booleans only): the chrome can never claim more than the gateway proved. */
  let tickerItems = [], tickerIdx = 0;

  function renderChrome() {
    const c = state.status;
    const feed = CityCore.activityFeed(c, 10);
    const working = new Set(feed.filter(t => t.status === 'running' || t.status === 'accepted')
      .map(t => String(t.agent || '').toUpperCase()).filter(Boolean));
    const citizens = (c && Array.isArray(c.citizens)) ? c.citizens : [];
    const ia = $('#inst-agents'), it = $('#inst-tasks'), ir = $('#inst-receipt');
    if (ia) ia.textContent = 'AGENTS ' + working.size + ' WORKING / ' + Math.max(0, citizens.length - working.size) + ' IDLE';
    if (it) it.textContent = 'TASKS ' + feed.length + ' LOGGED';
    const rec = feed.filter(t => t.receipted);
    const newest = rec.length ? (rec[0].settledAgoMin != null ? rec[0].settledAgoMin : rec[0].startedAgoMin) : null;
    if (ir) ir.textContent = newest == null ? 'NO RECEIPTS YET' : 'LAST RECEIPT ' + (newest < 1 ? 'JUST NOW' : newest + ' MIN AGO');
    tickerItems = feed.slice(0, 5).map(t => ({
      text: t.status.toUpperCase() + ' · ' + t.label + (t.agent ? ' · ' + t.agent : '') + (t.receipted ? ' · receipted' : ''),
      bad: t.status === 'failed'
    }));
    const list = $('#crew-list');
    if (list) {
      list.textContent = '';
      if (!citizens.length) list.appendChild(el('div', 'note', 'No crew roster reported by the gateway.'));
      for (const cz of citizens) {
        const name = String(cz.name || cz.id || '?').toUpperCase();
        const row = el('div', 'crewrow');
        row.appendChild(el('span', 'pill ' + (working.has(name) ? 'running' : 'idle'), working.has(name) ? 'working' : 'idle'));
        row.appendChild(document.createTextNode(' ' + name));
        list.appendChild(row);
      }
    }
  }

  function tickTicker() {
    const n = $('#cam-ticker'); if (!n) return;
    if (!tickerItems.length) { n.textContent = 'NO GATEWAY ACTIVITY RECORDED — IDLE IS A STATE, NOT A MALFUNCTION'; n.classList.remove('bad'); return; }
    const item = tickerItems[tickerIdx % tickerItems.length]; tickerIdx++;
    n.textContent = item.text; n.classList.toggle('bad', !!item.bad);
  }

  function boot() {
    if (typeof CityOS !== 'undefined' && typeof CityCore !== 'undefined') {
      state.model = CityCore.cityModel(CityOS);
      $('#cityname').textContent = state.model.name;
      $('#counts').textContent = state.model.counts.districts + ' districts · ' + state.model.counts.buildings + ' buildings · ' + state.model.counts.slots + ' specialist slots';
    }
    setMode('offline', 'Connecting…');
    $('#whole-city').addEventListener('click', () => { try { if (typeof World !== 'undefined' && World.fitWorld) World.fitWorld(48); else if (typeof World !== 'undefined' && World.camPullBack) World.camPullBack(); } catch (_) {} });
    document.getElementById('whole-city').addEventListener('click', () => { const v = document.getElementById('cam-view'); if (v) v.textContent = 'WHOLE CITY'; });
    const ct = document.getElementById('crew-tab'); if (ct) ct.addEventListener('click', () => document.getElementById('crew-rail').classList.toggle('open'));
    setInterval(tickTicker, 6000);
    $('#feed-toggle').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
    $('#panel-close').addEventListener('click', () => document.body.classList.add('panel-hidden'));
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') document.body.classList.add('panel-hidden'); });
    poll();
    state.timer = setInterval(poll, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
