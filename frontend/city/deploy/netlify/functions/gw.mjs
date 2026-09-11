/* Same-origin proxy: city page -> Netlify function -> Pauli gateway.
   The gateway bearer token lives only in this function's environment
   (PAULI_GATEWAY_URL, PAULI_GATEWAY_TOKEN), never in the browser. */
export default async (req) => {
  const GW = (process.env.PAULI_GATEWAY_URL || '').replace(/\/+$/, '');
  const TOK = process.env.PAULI_GATEWAY_TOKEN || '';
  if (!GW || !TOK) {
    return new Response(JSON.stringify({ error: 'gateway not configured' }), {
      status: 503, headers: { 'content-type': 'application/json' }
    });
  }
  const url = new URL(req.url);
  const sub = url.pathname.replace(/^\/\.netlify\/functions\/gw/, '') || '/';
  const headers = { authorization: 'Bearer ' + TOK };
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    headers['content-type'] = req.headers.get('content-type') || 'application/json';
    body = await req.text();
  }
  try {
    const resp = await fetch(GW + sub + url.search, { method: req.method, headers, body });
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'content-type': resp.headers.get('content-type') || 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'gateway unreachable' }), {
      status: 502, headers: { 'content-type': 'application/json' }
    });
  }
};
