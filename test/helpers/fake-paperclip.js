'use strict';
// TEST DOUBLE - NOT PAPERCLIP. A contract-faithful stand-in for the subset of the Paperclip REST API documented at
// docs.paperclip.ing (issues, comments, checkout, agents pause/resume, http-adapter wakeups). It exists so the
// StarNet gateway's REAL HTTP paths (client, bridge, Heisenberg, projection) can run in CI without a Paperclip server.
// Passing against this double proves our code honours the documented contract. It does NOT prove Paperclip behaves
// this way: scripts/factory-live-acceptance.mjs re-runs the same scenario against a real instance.
const http = require('http');

function makeFakePaperclip({ companyId = 'co-1', tokens, agents }) {
  const state = { issues: new Map(), comments: new Map(), agents: new Map(agents.map(a => [a.id, Object.assign({ status: 'idle' }, a)])), wakes: [], seq: 0 };
  const nextId = (p) => p + '-' + (++state.seq);
  let server; let base = '';

  const who = (req) => {
    const raw = String(req.headers.authorization || '');
    return raw.startsWith('Bearer ') ? tokens[raw.slice(7).trim()] || null : null;
  };
  const json = (res, code, body) => { const b = JSON.stringify(body); res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }); res.end(b); };
  const readBody = (req) => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => { try { r(JSON.parse(Buffer.concat(c).toString('utf8') || '{}')); } catch { r({}); } }); });
  const strip = (i, full) => full ? Object.assign({}, i) : Object.assign({}, i, { description: null });
  const ancestors = (i) => { const out = []; let p = i.parentId && state.issues.get(i.parentId); while (p) { out.push(Object.assign({}, p)); p = p.parentId && state.issues.get(p.parentId); } return out; };

  // Paperclip's http adapter: POST the wake context to the agent's configured URL with its configured headers.
  function wake(agentId, taskId, runId) {
    const a = state.agents.get(agentId);
    if (!a || !a.wakeUrl || a.status === 'paused' || a.status === 'terminated') return null;
    const rid = runId || nextId('run');
    state.wakes.push({ agentId, taskId, runId: rid });
    const u = new URL(a.wakeUrl);
    const body = JSON.stringify({ runId: rid, agentId, companyId, context: { taskId, wakeReason: 'issue_assigned' } });
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, a.wakeHeaders || {}) }, r => r.resume());
    req.on('error', () => {});
    req.end(body);
    return rid;
  }
  // state.autoWake = false lets a test create fixtures without the double waking them (it otherwise wakes every todo task it assigns).
  const maybeWake = (i) => { if (state.autoWake !== false && i.status === 'todo' && i.assigneeAgentId) wake(i.assigneeAgentId, i.id); };

  async function route(req, res) {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    const me = who(req);
    if (!me) return json(res, 401, { error: 'Unauthenticated' });
    let m;

    if (req.method === 'GET' && (m = /^\/api\/companies\/([^/]+)\/agents$/.exec(p))) return json(res, 200, [...state.agents.values()].map(a => ({ id: a.id, name: a.name, role: a.role, status: a.status })));
    if (req.method === 'GET' && (m = /^\/api\/agents\/([^/]+)$/.exec(p))) { const a = state.agents.get(m[1]); return a ? json(res, 200, { id: a.id, name: a.name, role: a.role, status: a.status }) : json(res, 404, { error: 'Not found' }); }
    if (req.method === 'POST' && (m = /^\/api\/agents\/([^/]+)\/(pause|resume)$/.exec(p))) {
      if (me.type !== 'board') return json(res, 403, { error: 'Forbidden' });
      const a = state.agents.get(m[1]); if (!a) return json(res, 404, { error: 'Not found' });
      a.status = m[2] === 'pause' ? 'paused' : 'idle';
      if (m[2] === 'resume') for (const i of state.issues.values()) if (i.assigneeAgentId === a.id) maybeWake(i);
      return json(res, 200, { id: a.id, status: a.status });
    }
    if (req.method === 'POST' && /^\/api\/heartbeat-runs\/[^/]+\/cancel$/.test(p)) return json(res, 200, { ok: true });

    if (req.method === 'GET' && (m = /^\/api\/companies\/([^/]+)\/issues$/.exec(p))) {
      let rows = [...state.issues.values()];
      const parents = url.searchParams.get('parentIds'); if (parents) rows = rows.filter(i => parents.split(',').includes(i.parentId));
      const st = url.searchParams.get('status'); if (st) rows = rows.filter(i => st.split(',').includes(i.status));
      const as = url.searchParams.get('assigneeAgentId'); if (as) rows = rows.filter(i => i.assigneeAgentId === as);
      return json(res, 200, rows.map(i => strip(i, false)));
    }
    if (req.method === 'POST' && (m = /^\/api\/companies\/([^/]+)\/issues$/.exec(p))) {
      const b = await readBody(req);
      const i = { id: nextId('iss'), companyId: b.companyId || companyId, title: b.title, description: b.description || '', status: b.status || 'todo', priority: b.priority || 'medium', assigneeAgentId: b.assigneeAgentId || null, parentId: b.parentId || null, projectId: b.projectId || null, createdAt: new Date().toISOString() };
      state.issues.set(i.id, i); state.comments.set(i.id, []);
      json(res, 201, i); maybeWake(i); return;
    }
    if ((m = /^\/api\/issues\/([^/]+)$/.exec(p))) {
      const i = state.issues.get(m[1]); if (!i) return json(res, 404, { error: 'Not found' });
      if (req.method === 'GET') return json(res, 200, Object.assign({}, i, { ancestors: ancestors(i) }));
      if (req.method === 'PATCH') {
        const b = await readBody(req);
        const wasTodo = i.status === 'todo';
        for (const k of ['title', 'description', 'status', 'priority', 'assigneeAgentId', 'projectId', 'parentId']) if (b[k] !== undefined) i[k] = b[k];
        if (b.comment) state.comments.get(i.id).push({ id: nextId('cm'), issueId: i.id, body: typeof b.comment === 'string' ? b.comment : b.comment.body, authorAgentId: me.agentId || null, createdAt: new Date().toISOString() });
        json(res, 200, i); if (!wasTodo) maybeWake(i); return;
      }
    }
    if (req.method === 'POST' && (m = /^\/api\/issues\/([^/]+)\/checkout$/.exec(p))) {
      const i = state.issues.get(m[1]); if (!i) return json(res, 404, { error: 'Not found' });
      const b = await readBody(req);
      if (!(b.expectedStatuses || []).includes(i.status)) return json(res, 409, { error: 'Issue is not in an expected status' });
      i.status = 'in_progress'; i.assigneeAgentId = b.agentId; return json(res, 200, i);
    }
    if ((m = /^\/api\/issues\/([^/]+)\/comments$/.exec(p))) {
      const list = state.comments.get(m[1]); if (!list) return json(res, 404, { error: 'Not found' });
      if (req.method === 'GET') return json(res, 200, list);
      if (req.method === 'POST') { const b = await readBody(req); const c = { id: nextId('cm'), issueId: m[1], body: b.body, authorAgentId: me.agentId || null, createdAt: new Date().toISOString() }; list.push(c); return json(res, 201, c); }
    }
    return json(res, 404, { error: 'Not found' });
  }

  return {
    state, wake,
    listen: () => new Promise(resolve => { server = http.createServer((q, s) => route(q, s).catch(e => json(s, 500, { error: e.message }))); server.listen(0, '127.0.0.1', () => { base = 'http://127.0.0.1:' + server.address().port; resolve(base); }); }),
    close: () => new Promise(r => server.close(r)),
    get url() { return base; }
  };
}

module.exports = { makeFakePaperclip };
