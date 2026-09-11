/* Same-origin proxy: city page -> Netlify function -> Pauli gateway.
   PUBLIC READ-ONLY boundary. Two GET reads pass; every write and every other
   path is refused BEFORE any upstream fetch. Nothing upstream is forwarded
   verbatim: both responses are CONSTRUCTED allowlisted DTOs, so unknown,
   nested, or future upstream fields can never leak. The privileged bearer
   token lives only in this function's environment; visitor headers are never
   forwarded. Deliberately public: city name, roster names/roles/districts,
   coarse task states with short summaries, relative ages, opaque event ids.
   Never public: internal task/receipt/agent ids, full prompts, errors,
   provider/model/org/quota, infra, approvals, missions, revenue, costs,
   experiments, exact timestamps. */

import crypto from 'node:crypto';

const ROUTES = [
  { method: 'GET', match: /^\/v1\/city\/status$/, kind: 'status' },
  { method: 'GET', match: /^\/v1\/city\/world$/, kind: 'world' }
];

const JSONH = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const refuse = (status, msg) => new Response(JSON.stringify({ error: msg }), { status, headers: JSONH });
const text = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max || 80) : null);
const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
const agoMin = (iso, now) => {
  const t = Date.parse(typeof iso === 'string' ? iso : '');
  return isFinite(t) ? Math.max(0, Math.round((now - t) / 60000)) : null;
};
const TILEKEY = /^\d{1,4},\d{1,4}$/;
const STYLEID = /^[a-z0-9_-]{1,24}$/i;
/* floorPaint is a per-tile style-override map ("x,y" -> styleId). Both halves
   are allowlisted: keys must be tile coords, values a style-id scalar or a
   finite int. Anything else (proto keys, html, objects) is dropped. */
const sanitizePaint = fp => {
  const out = {};
  if (!fp || typeof fp !== 'object') return out;
  for (const [k, v] of Object.entries(fp)) {
    if (!TILEKEY.test(k)) continue;
    if (typeof v === 'number' && isFinite(v)) out[k] = Math.trunc(v);
    else if (typeof v === 'string' && STYLEID.test(v)) out[k] = v;
  }
  return out;
};
const eventId = internal => 'ev_' + crypto.createHash('sha256').update('pauli-city:' + String(internal)).digest('hex').slice(0, 12);

/* Coarse public activity categories. The enum is ALL that ever escapes — task
   text is read server-side ONLY to pick the bucket and is never emitted. */
const CATEGORY_WORDS = [
  ['research', /\b(research|search|fetch|look ?up|investigate|find)\b/i],
  ['comms', /\b(write|draft|post|publish|reply|email|message|announce|report)\b/i],
  ['commerce', /\b(order|trade|sell|buy|invoice|listing|product|price|shop)\b/i],
  ['ops', /\b(build|deploy|fix|code|compile|test|refactor|run|move)\b/i]
];
function categorize(t) {
  const ctx = (t && typeof t === 'object' && t.context && typeof t.context === 'object') ? t.context : {};
  const hay = [typeof t.task === 'string' ? t.task : '', typeof ctx.slot === 'string' ? ctx.slot : '', typeof ctx.district === 'string' ? ctx.district : ''].join('\n');
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(hay)) return cat;
  return 'ops';
}

/* Public status DTO. Citizens carry no internal ids; task receipts carry no
   internal ids, no prompts, no errors, NO TASK TEXT — an opaque event id, a
   coarse state, the bound agent's PUBLIC name, a coarse category, relative ages. */
function statusDTO(src, now) {
  const s = (src && typeof src === 'object') ? src : {};
  const health = !!(s.health && s.health.status === 'online') && !s.degraded;
  const citizens = (Array.isArray(s.citizens) ? s.citizens : [])
    .map(c => (c && typeof c === 'object') ? {
      name: text(c.name, 40),
      role: text(c.role, 40),
      district: text(c.district, 40),
      status: c.status === 'online' ? 'online' : 'offline',
      hero: c.id === 'agent' || c.role === 'orchestrator' || undefined
    } : null)
    .filter(c => c && c.name)
    .map(c => { if (!c.hero) delete c.hero; return c; });
  const activity = (Array.isArray(s.activeTasks) ? s.activeTasks : [])
    .map(t => (t && typeof t === 'object' && t.id != null) ? {
      event: eventId(t.id),
      state: ['running', 'completed', 'failed', 'accepted'].includes(t.status) ? t.status : 'unknown',
      agent: (t.context && typeof t.context.agentId === 'string')
        ? text(((Array.isArray(s.citizens) ? s.citizens : []).find(c => c && c.id === t.context.agentId) || {}).name, 40) || null
        : null,
      category: categorize(t),
      startedAgoMin: agoMin(t.startedAt, now),
      settledAgoMin: agoMin(t.completedAt, now),
      receipt: !!(t.receiptId)
    } : null)
    .filter(Boolean);
  return {
    live: health,
    city: { name: text(s.city && s.city.name, 60) || "Pauli's Place" },
    generatedAgoMin: agoMin(s.generatedAt, now),
    citizens,
    activity
  };
}

/* Public world DTO. Geometry only, constructed field-by-field; agent bindings
   on props are rewritten to PUBLIC roster names (the page binds bodies by name).
   Unknown station fields — including anything nested — are dropped. */
function worldDTO(src, idToName) {
  const w = (src && typeof src === 'object') ? src : {};
  const st = (w.station && typeof w.station === 'object') ? w.station : {};
  if (!st.rooms || typeof st.rooms !== 'object') return { ok: false, error: 'no station' };
  const rooms = {};
  for (const [rid, r] of Object.entries(st.rooms)) {
    if (!r || typeof r !== 'object') continue;
    rooms[rid] = {
      id: text(r.id, 40) || rid,
      kind: text(r.kind, 24),
      name: text(r.name, 40),
      rects: (Array.isArray(r.rects) ? r.rects : [])
        .map(q => (q && typeof q === 'object') ? { x1: num(q.x1), y1: num(q.y1), x2: num(q.x2), y2: num(q.y2) } : null)
        .filter(q => q && q.x1 != null && q.y1 != null && q.x2 != null && q.y2 != null),
      floorStyle: text(r.floorStyle, 24),
      wallStyle: text(r.wallStyle, 24),
      tier: num(r.tier) || 0,
      floorPaint: sanitizePaint(r.floorPaint)
    };
  }
  const props = (Array.isArray(st.props) ? st.props : [])
    .map(p => (p && typeof p === 'object') ? {
      id: text(p.id, 40),
      t: text(p.t, 40),
      x: num(p.x), y: num(p.y), w: num(p.w), h: num(p.h),
      block: p.block !== false,
      agentId: p.agentId ? (idToName.get(String(p.agentId)) || null) : undefined,
      brief: undefined
    } : null)
    .filter(p => p && p.id && p.t && p.x != null && p.y != null)
    .map(p => { if (p.agentId == null) delete p.agentId; delete p.brief; return p; });
  const belts = {};
  if (st.belts && typeof st.belts === 'object') {
    for (const [k, v] of Object.entries(st.belts)) if (TILEKEY.test(k) && typeof v === 'string' && v.length <= 4) belts[k] = v;
  }
  const edges = (Array.isArray(st.edges) ? st.edges : [])
    .map(e => (e && typeof e === 'object') ? {
      from: e.from ? (idToName.get(String(e.from)) || null) : null,
      to: e.to ? (idToName.get(String(e.to)) || null) : null,
      whenKind: text(e.whenKind, 24)
    } : null)
    .filter(e => e && e.from && e.to);
  return {
    ok: true,
    station: {
      schema: 'starnet.station',
      version: num(st.version) || 1,
      meta: {
        name: text(st.meta && st.meta.name, 60) || "PAULI'S PLACE",
        tier: num(st.meta && st.meta.tier) || 0,
        spawnRoomId: rooms[st.meta && st.meta.spawnRoomId] ? st.meta.spawnRoomId : null,
        trunkRoomId: rooms[st.meta && st.meta.trunkRoomId] ? st.meta.trunkRoomId : null
      },
      rooms,
      order: (Array.isArray(st.order) ? st.order : []).filter(id => typeof id === 'string' && rooms[id]),
      props,
      belts,
      edges
    }
  };
}

export default async (req) => {
  const GW = (process.env.PAULI_GATEWAY_URL || '').replace(/\/+$/, '');
  const TOK = process.env.PAULI_GATEWAY_TOKEN || '';
  if (!GW || !TOK) return refuse(503, 'gateway not configured');

  const url = new URL(req.url);
  const sub = url.pathname.replace(/^\/\.netlify\/functions\/gw/, '') || '/';
  const route = ROUTES.find(r => r.method === req.method && r.match.test(sub));
  if (!route) return refuse(404, 'not found');   // writes + unknown/near-match paths die here

  const get = async path => {
    const resp = await fetch(GW + path, { method: 'GET', headers: { authorization: 'Bearer ' + TOK } });
    if (!resp.ok) throw Object.assign(new Error('upstream'), { status: resp.status });
    return resp.json();
  };

  try {
    if (route.kind === 'status') {
      return new Response(JSON.stringify(statusDTO(await get('/v1/city/status'), Date.now())), { status: 200, headers: JSONH });
    }
    // world: geometry + the id->public-name map from the status read
    const [world, status] = await Promise.all([get('/v1/city/world'), get('/v1/city/status')]);
    const idToName = new Map((Array.isArray(status.citizens) ? status.citizens : [])
      .filter(c => c && c.id && c.name).map(c => [String(c.id), String(c.name)]));
    const out = worldDTO(world, idToName);
    return new Response(JSON.stringify(out), { status: out.ok ? 200 : 503, headers: JSONH });
  } catch (e) {
    return refuse(e && e.status === 404 ? 404 : 502, 'upstream refused');
  }
};
