/* OWNER MODE — the authenticated counterpart to the public read-only city.
   Separate function, separate trust boundary: the public gw.mjs stays GET-only
   DTOs with zero credentials; THIS function is the ONLY path that attaches the
   server-side gateway bearer, and only after a server-issued session cookie
   checks out. No URL tokens, no localStorage, no client-held secrets.

   Session: stateless HMAC cookie (HttpOnly, Secure, SameSite=Lax). The login
   secret lives ONLY in the OWNER_SECRET env var (set by the owner in Netlify
   project configuration); when it is unset the whole surface stays dark (503).

   Exposed owner capabilities THIS ROUND: session + task composition. Spend and
   destructive actions are NOT routed here at all — they stay behind the
   gateway's own approval gates in the desktop app. */
const JSONH = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const refuse = (status, msg) => new Response(JSON.stringify({ error: msg }), { status, headers: JSONH });
const ok = (body, extra) => new Response(JSON.stringify(body), { status: 200, headers: { ...JSONH, ...(extra || {}) } });

const b64 = buf => Buffer.from(buf).toString('base64url');
async function hmac(payload, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}
function tse(a, b) { // timing-safe equal on equal-length strings
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const COOKIE = 'pauli_owner';
const TTL_MS = 12 * 3600 * 1000;
async function issueCookie(secret) {
  const exp = String(Date.now() + TTL_MS);
  return COOKIE + '=' + exp + '.' + (await hmac(exp, secret)) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + (TTL_MS / 1000);
}
async function sessionValid(req, secret) {
  const raw = (req.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const val = raw.slice(COOKIE.length + 1);
  const dot = val.indexOf('.');
  if (dot < 1) return false;
  const exp = val.slice(0, dot), sig = val.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return tse(sig, await hmac(exp, secret));
}

const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max || 40) : null);

export default async (req) => {
  const url = new URL(req.url);
  const base = url.pathname.replace(/^.*\.netlify\/functions\/owner/, '') || '/';
  const secret = process.env.OWNER_SECRET || '';
  const upstream = (process.env.PAULI_GATEWAY_URL || '').replace(/\/+$/, '');
  const bearer = process.env.PAULI_GATEWAY_TOKEN || '';

  if (base === '/session' && req.method === 'GET') {
    if (!secret) return refuse(503, 'owner mode not configured');
    return (await sessionValid(req, secret)) ? ok({ owner: true }) : refuse(401, 'no session');
  }
  if (base === '/login' && req.method === 'POST') {
    if (!secret) return refuse(503, 'owner mode not configured');
    let body = null; try { body = await req.json(); } catch (_) {}
    const given = body && typeof body.secret === 'string' ? body.secret : '';
    if (!given || given.length !== secret.length || !tse(given, secret)) return refuse(401, 'wrong secret');
    return ok({ owner: true }, { 'set-cookie': await issueCookie(secret) });
  }
  if (base === '/logout' && req.method === 'POST') {
    return ok({ owner: false }, { 'set-cookie': COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
  }
  if (base === '/tasks' && req.method === 'POST') {
    if (!secret) return refuse(503, 'owner mode not configured');
    if (!(await sessionValid(req, secret))) return refuse(401, 'no session');
    if (!upstream || !bearer) return refuse(503, 'gateway not configured');
    let body = null; try { body = await req.json(); } catch (_) {}
    const task = body && typeof body.task === 'string' ? body.task.trim().slice(0, 2000) : '';
    if (!task) return refuse(400, 'task text required');
    const ctx = (body && body.context && typeof body.context === 'object') ? body.context : {};
    const context = { source: 'city-web-owner' };
    for (const k of ['district', 'building', 'slot']) { const v = clean(ctx[k], 40); if (v) context[k] = v; }
    const r = await fetch(upstream + '/v1/heisenberg/tasks', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + bearer },
      body: JSON.stringify({ task, context })
    }).catch(() => null);
    if (!r) return refuse(502, 'gateway unreachable');
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return refuse(502, 'gateway refused the task');
    // owner sees its own task id + receipt (authenticated surface); nothing else forwards.
    return ok({ state: 'accepted', taskId: clean(d.id || d.task_id, 64), receipt: !!(d.receipt && d.receipt.receipt_id) });
  }
  return refuse(404, 'not found');
};
