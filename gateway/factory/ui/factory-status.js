/* STARNET - factory-status.js : STARFACTORY-001 read-only projection of Paperclip into the station.
   It renders what the gateway's /v1/factory/events stream says and NOTHING else: no timers that advance state, no
   optimistic updates, no animation that implies work. Every row shows the evidence (source + run id) behind its state.
   On disconnect every row becomes "unknown" - stale data is never presented as live.
   Dormant unless configured:  localStorage['starnet.factory.gateway'] = 'https://<private gateway>'
                               localStorage['starnet.factory.token']   = '<owner bearer>'   (per-browser, never committed)
   PURE reducer + node-testable, mirroring autonomy.js: a `FactoryStatus` global in the browser, module.exports under node. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.FactoryStatus = api; if (typeof document !== 'undefined') api.autostart(root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATES = ['sleeping', 'waking', 'planning', 'working', 'delegating', 'waiting', 'reviewing', 'blocked', 'awaiting_approval', 'failed', 'recovering', 'completed', 'unknown'];

  function fresh() { return { connected: false, epoch: null, lastEventId: null, stopped: false, agents: {}, handoffs: [], missions: [] }; }

  // A full resync REPLACES the model. It is the only way state enters except a real transition event.
  function applyEvent(model, ev) {
    const m = Object.assign({}, model, { lastEventId: ev.id || model.lastEventId });
    const d = ev.data || {};
    if (ev.type === 'factory.resync') {
      m.epoch = d.epoch || m.epoch; m.stopped = !!d.stopped; m.missions = d.missions || [];
      m.agents = {};
      for (const [k, a] of Object.entries(d.agents || {})) m.agents[k] = { key: k, name: a.name, role: a.role, state: a.state, mission: a.mission || null, evidence: a.evidence || null, reason: a.reason || null };
      m.handoffs = [];
    } else if (ev.type === 'factory.agent.state') {
      const prev = m.agents[d.key] || { key: d.key, name: d.key, role: '' };
      m.agents = Object.assign({}, m.agents, { [d.key]: Object.assign({}, prev, { state: d.to, mission: d.mission || null, evidence: d.evidence || null }) });
    } else if (ev.type === 'factory.handoff') {
      m.handoffs = [{ mission: d.mission, stage: d.stage, from: d.from, to: d.to, issueId: d.issueId, at: ev.at }].concat(m.handoffs).slice(0, 20);
    } else if (ev.type === 'factory.task.status') {
      // kept in the log only; per-task state is not drawn here
    }
    return m;
  }

  // Link lost: we no longer know anything. Say so.
  function markDisconnected(model) {
    const agents = {};
    for (const [k, a] of Object.entries(model.agents)) agents[k] = Object.assign({}, a, { state: 'unknown', evidence: null, reason: 'factory link offline' });
    return Object.assign({}, model, { connected: false, agents });
  }

  // Minimal SSE frame parser (EventSource cannot send an Authorization header).
  function parseFrames(buffer) {
    const parts = buffer.split('\n\n'); const rest = parts.pop(); const events = [];
    for (const p of parts) {
      const id = /^id: (.*)$/m.exec(p); const type = /^event: (.*)$/m.exec(p); const data = /^data: (.*)$/m.exec(p);
      if (type && data) { try { events.push({ id: id ? id[1] : null, type: type[1], data: JSON.parse(data[1]) }); } catch (e) { /* skip torn frame */ } }
    }
    return { events, rest };
  }

  function connect({ gateway, token, fetchImpl, onModel, retryMs = 3000 }) {
    let model = fresh(); let stopped = false; let abort = null;
    const set = (m) => { model = m; onModel && onModel(model); };
    async function loop() {
      while (!stopped) {
        try {
          abort = new AbortController();
          const headers = { Authorization: 'Bearer ' + token, Accept: 'text/event-stream' };
          if (model.lastEventId) headers['Last-Event-ID'] = model.lastEventId;
          const res = await (fetchImpl || fetch)(gateway.replace(/\/+$/, '') + '/v1/factory/events', { headers, signal: abort.signal });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          set(Object.assign({}, model, { connected: true }));
          const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
          for (;;) {
            const { done, value } = await reader.read(); if (done) break;
            buf += dec.decode(value, { stream: true });
            const r = parseFrames(buf); buf = r.rest;
            for (const ev of r.events) set(applyEvent(model, ev));
          }
        } catch (e) { /* fall through to offline */ }
        if (stopped) break;
        set(markDisconnected(model));
        await new Promise(r => setTimeout(r, retryMs));
      }
    }
    loop();
    return { stop() { stopped = true; if (abort) abort.abort(); }, model: () => model };
  }

  const COLORS = { sleeping: '#6b7280', waking: '#a78bfa', planning: '#60a5fa', working: '#34d399', delegating: '#fbbf24', waiting: '#9ca3af', reviewing: '#38bdf8', blocked: '#f87171', awaiting_approval: '#fb923c', failed: '#ef4444', recovering: '#f472b6', completed: '#22c55e', unknown: '#4b5563' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderHtml(model) {
    const rows = Object.values(model.agents).map(a => {
      const ev = a.evidence ? esc(a.evidence.source) + (a.evidence.runId ? ' · run ' + esc(String(a.evidence.runId).slice(-8)) : '') : esc(a.reason || 'no evidence');
      return '<div class="fs-row"><span class="fs-dot" style="background:' + (COLORS[a.state] || COLORS.unknown) + '"></span><b>' + esc(a.name || a.key) + '</b> <span class="fs-state">' + esc(String(a.state).replace('_', ' ')) + '</span>' + (a.mission ? ' <span class="fs-mission">' + esc(a.mission) + '</span>' : '') + '<div class="fs-ev">' + ev + '</div></div>';
    }).join('');
    const hand = model.handoffs.slice(0, 5).map(h => '<div class="fs-ho">' + esc(h.from) + ' → ' + esc(h.to) + ' · ' + esc(h.stage) + ' · ' + esc(h.mission) + '</div>').join('');
    return '<div class="fs-head">Factory ' + (model.connected ? (model.stopped ? '· STOPPED' : '· live') : '· offline') + '</div>' + rows + (hand ? '<div class="fs-sub">Recent handoffs</div>' + hand : '');
  }

  function autostart(root) {
    let gateway = null; let token = null;
    try { gateway = root.localStorage.getItem('starnet.factory.gateway'); token = root.localStorage.getItem('starnet.factory.token'); } catch (e) { return; }
    if (!gateway || !token) return;                                  // dormant unless configured
    const el = root.document.createElement('div');
    el.id = 'factory-status'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:50;max-width:320px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,17,23,.92);color:#e5e7eb;border:1px solid #2a2f3a;border-radius:8px;padding:8px 10px;';
    const css = root.document.createElement('style');
    css.textContent = '#factory-status .fs-head{font-weight:600;margin-bottom:4px}#factory-status .fs-row{margin:3px 0}#factory-status .fs-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}#factory-status .fs-state{opacity:.85}#factory-status .fs-mission{opacity:.6}#factory-status .fs-ev{opacity:.5;font-size:11px;margin-left:14px}#factory-status .fs-sub{margin-top:6px;opacity:.7}#factory-status .fs-ho{opacity:.8;font-size:11px}';
    root.document.head.appendChild(css); root.document.body.appendChild(el);
    connect({ gateway, token, onModel: (m) => { el.innerHTML = renderHtml(m); } });
  }

  return { STATES, fresh, applyEvent, markDisconnected, parseFrames, connect, renderHtml, autostart };
});
