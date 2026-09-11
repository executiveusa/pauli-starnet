/* Pauli's Place — LIVE WORLD boot. Makes the REAL 2D world (world.js — the same renderer
 * the desktop app uses) the primary view: the compiled city geometry comes from the gateway's
 * read-only /v1/city/world route, agents are the app's real sprite-sheet characters, and every
 * movement is bound to gateway-reported running tasks (setActivityFor drives the app's own BFS
 * walking). Nothing animates without gateway evidence. No station compiled = an honest note,
 * never a fabricated world. */
'use strict';
(function () {
  // world.js's optional telemetry hooks call apiUrl(); with no sidecar on this surface the
  // calls 404 fast and are guarded internally. Define it before World.init runs.
  if (typeof window.apiUrl !== 'function') window.apiUrl = function (p) { return p; };

  const DEFAULT_GW = '/.netlify/functions/gw';
  const applied = {};            // agentId -> currently working (as last applied to the world)
  let booted = false;
  let knownIds = [];

  /* FIXED backend: a visitor can NEVER point this page at another gateway and
     NEVER attaches credentials — no ?gateway override, no localStorage tokens.
     (Owner-mode control, when it exists, is a separate authenticated surface.) */
  function gwBase() { return DEFAULT_GW; }

  function note(msg) {
    const n = document.getElementById('world-note');
    if (n) n.textContent = msg;
  }
  function fallback(msg) {
    const f = document.getElementById('world-fallback');
    if (f) { f.hidden = false; f.textContent = msg; }
    note('Live world unavailable — see the activity panel for gateway state.');
  }

  async function fetchWorldDoc() {
    const r = await fetch(gwBase() + '/v1/city/world', { cache: 'no-store' });
    if (!r.ok) return { error: 'http ' + r.status };
    const w = await r.json();
    return w || {};
  }

  let spawned = false;
  let lastWorld = null;   // the gateway world doc (rooms/props) — drives the boot camera
  function spawnBodies(citizens) {
    const plan = CityCore.worldSpawnPlan(citizens);
    if (!plan.length) return false;
    knownIds = plan.map(p => p.id);
    for (const p of plan) {
      try {
        if (typeof registerAgent === 'function') registerAgent(p.id, undefined);
        if (p.hero) World.spawn({ id: p.id, name: p.name, skin: p.skin });
        else World.spawnAgent({ id: p.id, name: p.name, skin: p.skin });
        // City-scale floors strand a fresh body at the spawn hab (only belt-fed bays pre-place via the
        // routing plan) — a hundred tiles outside the zone its own desk/bay anchor computes, so the idle
        // engine freezes it there. Re-foot it at its bound workstation, the same spot the desktop plan
        // would have put it.
        if (typeof World.placeAtWorkstation === 'function') World.placeAtWorkstation(p.id);
        if (typeof SPRITES !== 'undefined' && SPRITES.ensureSkin) SPRITES.ensureSkin(p.skin);
      } catch (_) { /* one broken body must not take down the city */ }
    }
    return true;
  }

  function applyStatus(status) {
    if (!booted || typeof World === 'undefined') return;
    // The overlay's first poll usually lands AFTER the world boots: spawn bodies on the
    // first status that actually carries the roster, not from an empty boot-time read.
    if (!spawned && status && Array.isArray(status.citizens) && status.citizens.length) {
      spawned = spawnBodies(status.citizens);
    }
    const changes = CityCore.worldActivityDiff(applied, status, knownIds);
    for (const ch of changes) {
      applied[ch.id] = (ch.kind === 'task');
      try {
        World.setActivityFor(ch.id, ch.kind);
      } catch (_) { /* a missing body must not break the loop */ }
    }
  }

  async function bootWorld() {
    if (typeof World === 'undefined' || typeof WorldModel === 'undefined' || typeof PropSprites === 'undefined') {
      fallback('The 2D world renderer failed to load.');
      return;
    }
    let w;
    try { w = await fetchWorldDoc(); }
    catch (_) { fallback('The city world geometry is unreachable right now.'); return; }
    if (w.error || w.ok === false) { fallback('The city world geometry is unreachable right now (' + (w.error || w.message || 'error') + ').'); return; }
    if (!w.station) {
      fallback('The 9-district city has not been compiled into the live workspace yet. The activity panel still shows real gateway state.');
      return;
    }

    WorldModel.setPropRules(t => {
      const s = PropSprites.spec(t);
      return s ? { mount: s.mount || null, stack: !!s.stack, surface: !!s.surface, flat: !!s.flat } : null;
    });

    lastWorld = w.station;
    let station;
    try { station = WorldModel.deserialize(w.station); }
    catch (e) { fallback('The live world geometry could not be read (' + e.message + ').'); return; }

    World.loadStation(station);
    const cv = document.getElementById('world');
    World.init(cv);
    // CRT: the website/app demo's softened values, not the app's bold shipped defaults — the
    // full-strength scan/aberration/grain smears a small public viewport into haze.
    if (World.crt) {
      World.crt.scan = 0.20; World.crt.aberr = 0.12; World.crt.grain = 0.10;
      World.crt.dust = 0.30; World.crt.curve = 0.06; World.crt.fade = 0.16;
    }
    // Explicit cinecam policy: the desktop app's own default — the auto-director may take the
    // camera only after 2 minutes hands-off (CINE_IDLE_MS). Never sooner on a public view.
    if (typeof World.setCinecamIdle === 'function') World.setCinecamIdle(120000);
    if (typeof SPRITES !== 'undefined' && SPRITES.init) { try { await SPRITES.init(); } catch (_) {} }

    // citizens come from the gateway truth (the overlay polls it); spawn once at boot from
    // the freshest status the overlay already holds, then keep binding per poll.
    const status = (window.CitySurface && window.CitySurface.latest) ? window.CitySurface.latest() : null;
    if (status && Array.isArray(status.citizens) && status.citizens.length) spawned = spawnBodies(status.citizens);
    World.start();
    booted = true;
    // Open the camera centered on the OCCUPIED HERO BUILDING at a readable desktop-like zoom
    // (2.7x — the desktop app's own working range is 2.5-3x). Fallback: the placed-body bbox,
    // then the whole-map fit. One-shot, a beat after boot so spawn walks have placed bodies.
    setTimeout(() => {
      try {
        if (typeof World.bodySnapshots !== 'function') return;
        const snaps = World.bodySnapshots();
        // Frame the densest BOUND room (bay/desk assignments — the honest occupancy signal),
        // never the empty spawn hab bodies walk out of. Tie -> hero's room. Fallbacks: hero body,
        // body bbox, whole-map fit.
        const rf = (lastWorld && CityCore.occupiedRoomFrame) ? CityCore.occupiedRoomFrame(lastWorld.rooms, lastWorld.props, 12) : null;
        if (rf && rf.count >= 1 && typeof World.centerView === 'function') { World.centerView(rf.cx, rf.cy, 2.7); return; }
        const hero = snaps.find(b => b && b.placed && b.id === 'HEISENBERG') || snaps.find(b => b && b.placed);
        if (hero && typeof World.centerView === 'function') { World.centerView(hero.x, hero.y, 2.7); return; }
        if (typeof World.frameRect === 'function' && CityCore.occupiedFrame) {
          const f = CityCore.occupiedFrame(snaps);
          if (f && f.count >= 1) World.frameRect(f.x0, f.y0, f.x1, f.y1);
        }
      } catch (_) { /* framing is a nicety, never a boot blocker */ }
    }, 2200);
    note('Live world: ' + (w.station.meta && w.station.meta.name || "PAULI'S PLACE") + ' — idle agents stroll their own area (desktop behavior); work runs bind to gateway-reported tasks.');
    applyStatus(status);
  }

  // The overlay owns polling and calls CityWorld.applyStatus on every result; self-subscribe too
  // when the overlay registered first (script order is not a coupling we rely on).
  window.CityWorld = { applyStatus, bootWorld, _applied: applied };
  if (window.CitySurface && window.CitySurface.onStatus) window.CitySurface.onStatus(applyStatus);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootWorld);
  else bootWorld();
})();
