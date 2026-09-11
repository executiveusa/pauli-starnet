/* Same-origin proxy: city page -> Netlify function -> Pauli gateway.
   PUBLIC READ-ONLY ALLOWLIST — this function is the public security boundary.
   Only three GET reads pass; every write and every other path is refused BEFORE
   any upstream fetch. The privileged gateway bearer token lives only in this
   function's environment, is attached server-side to those three reads alone,
   and visitor request headers are never forwarded. Public projections omit
   approvals, missions, revenue, costs, experiments, infra details, and any
   other owner-private state. */

const ROUTES = [
  { method: 'GET', match: /^\/v1\/city\/status$/, kind: 'status' },
  { method: 'GET', match: /^\/v1\/city\/world$/, kind: 'world' },
  { method: 'GET', match: /^\/v1\/heisenberg\/tasks\/[A-Za-z0-9-]+$/, kind: 'task' }
];

const JSONH = { 'content-type': 'application/json', 'cache-control': 'no-store' };

function refuse(status, msg) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: JSONH });
}

/* Public projection of /v1/city/status: live-mode signal, truthful roster
   (id/name/role/district), and gateway-reported task receipts. NOTHING else. */
function sanitizeStatus(s) {
  const src = (s && typeof s === 'object') ? s : {};
  const citizens = (Array.isArray(src.citizens) ? src.citizens : [])
    .map(c => (c && typeof c === 'object') ? {
      id: c.id || null, name: c.name || null, role: c.role || null,
      status: c.status || null, district: c.district || null
    } : null)
    .filter(c => c && c.id);
  const activeTasks = (Array.isArray(src.activeTasks) ? src.activeTasks : [])
    .map(t => (t && typeof t === 'object') ? {
      id: t.id || null,
      status: t.status || null,
      task: typeof t.task === 'string' ? t.task.slice(0, 280) : null,
      context: (t.context && t.context.agentId) ? { agentId: String(t.context.agentId) } : null,
      startedAt: t.startedAt || null,
      completedAt: t.completedAt || null,
      receiptId: t.receiptId || null
    } : null)
    .filter(t => t && t.id);
  return {
    degraded: !!src.degraded,
    generatedAt: src.generatedAt || null,
    city: {
      name: (src.city && src.city.name) || "Pauli's Place",
      status: (src.city && src.city.status) || 'unknown'
    },
    citizens,
    activeTasks,
    health: { status: (src.health && src.health.status === 'online') ? 'online' : 'offline' }
  };
}

/* Public projection of one task record: the receipt fields a viewer may verify. */
function sanitizeTask(t) {
  const src = (t && typeof t === 'object') ? t : {};
  return {
    id: src.id || src.task_id || null,
    status: src.status || 'unknown',
    task: typeof src.task === 'string' ? src.task.slice(0, 280) : null,
    context: (src.context && src.context.agentId) ? { agentId: String(src.context.agentId) } : null,
    startedAt: src.startedAt || null,
    completedAt: src.completedAt || null,
    receiptId: src.receiptId || (src.receipt && src.receipt.receipt_id) || null,
    error: typeof src.error === 'string' ? src.error.slice(0, 280) : null
  };
}

export default async (req) => {
  const GW = (process.env.PAULI_GATEWAY_URL || '').replace(/\/+$/, '');
  const TOK = process.env.PAULI_GATEWAY_TOKEN || '';
  if (!GW || !TOK) return refuse(503, 'gateway not configured');

  const url = new URL(req.url);
  const sub = url.pathname.replace(/^\/\.netlify\/functions\/gw/, '') || '/';
  const route = ROUTES.find(r => r.method === req.method && r.match.test(sub));
  if (!route) return refuse(404, 'not found');   // writes + unknown paths die here, before fetch

  let resp;
  try {
    resp = await fetch(GW + sub, { method: 'GET', headers: { authorization: 'Bearer ' + TOK } });
  } catch (e) {
    return refuse(502, 'gateway unreachable');
  }
  if (!resp.ok) return refuse(resp.status === 404 ? 404 : 502, 'upstream refused');

  let body;
  try { body = JSON.parse(await resp.text()); }
  catch (e) { return refuse(502, 'upstream unreadable'); }

  const out = route.kind === 'status' ? sanitizeStatus(body)
    : route.kind === 'task' ? sanitizeTask(body)
    : body;   // /v1/city/world is already a purpose-built sanitized read-only projection
  return new Response(JSON.stringify(out), { status: 200, headers: JSONH });
};
