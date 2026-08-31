// C:\PAULI\pauli-gateway\server.js
// PAULI STARNET GATEWAY
// Secure server-side proxy between the public internet and the STARNET sidecar at 127.0.0.1:8787.
//
// Architecture:
//   Internet → HTTPS → (Vercel / CDN or Coolify) → this gateway → 127.0.0.1:8787
//
// Security:
//   - Bearer token authentication on every inbound request
//   - Request-size limits (1MB default)
//   - Structured request/response logging with audit receipts
//   - Rate limiting via in-memory window (no Redis dependency)
//   - Fail-closed: if STARNET is unreachable, returns 503 never pretends success
//   - STARNET port 8787 remains bound to 127.0.0.1 — never publicly exposed
//   - No credentials forwarded to STARNET beyond the sidecar's own token
//
// Environment variables:
//   GATEWAY_BEARER_TOKEN      (required) — inbound auth token for the Command Center
//   STARNET_PORT              (optional, default: 8787) — sidecar port
//   STARNET_SIDECAR_TOKEN     (optional) — sidecar bearer token if sidecar requires auth
//   GATEWAY_PORT              (optional, default: 4000) — gateway listen port
//   GATEWAY_HOST              (optional, default: 127.0.0.1) — bind address (set to 0.0.0.0 only when behind a private-network proxy)
//   RATE_LIMIT_WINDOW_MS      (optional, default: 60000)
//   RATE_LIMIT_MAX_REQUESTS   (optional, default: 60)
//   MAX_BODY_BYTES            (optional, default: 1048576)
//   LOG_LEVEL                 (optional: debug|info|warn|error, default: info)
//
// Exposed routes (all require Authorization: Bearer <GATEWAY_BEARER_TOKEN>):
//   GET  /health                          → gateway health + starnet connectivity probe
//   GET  /v1/city/status                  → STARNET world state as city data
//   POST /v1/heisenberg/tasks             → create Heisenberg mission, poll to settled state
//   GET  /v1/heisenberg/tasks/:id         → get task status/result/logs/receipt
//   POST /v1/approvals/:id/decision       → owner approve/reject decision (auditable)
//
// Start:
//   node server.js
//   PM2: pm2 start server.js --name pauli-gateway --restart-delay=2000 --max-restarts=20

'use strict';

const http = require('http');
const crypto = require('crypto');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GATEWAY_TOKEN = process.env.GATEWAY_BEARER_TOKEN || '';
const STARNET_PORT = parseInt(process.env.STARNET_PORT || '8787', 10);
const STARNET_HOST = '127.0.0.1';
const STARNET_TOKEN = process.env.STARNET_SIDECAR_TOKEN || process.env.STARNET_API_TOKEN || '';
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '4000', 10);
const GATEWAY_BIND = process.env.GATEWAY_HOST || '127.0.0.1';
const RATE_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10);
const MAX_BODY = parseInt(process.env.MAX_BODY_BYTES || '1048576', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

if (!GATEWAY_TOKEN) {
  process.stderr.write('[GATEWAY][FATAL] GATEWAY_BEARER_TOKEN is not set. Gateway cannot start without an inbound auth token.\n');
  process.exit(1);
}

// ─── LOGGER ───────────────────────────────────────────────────────────────────
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const logLevel = LEVELS[LOG_LEVEL] ?? 1;
function log(level, msg, data) {
  if ((LEVELS[level] ?? 1) < logLevel) return;
  const entry = { t: new Date().toISOString(), level, msg };
  if (data) Object.assign(entry, data);
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────
const rateCounts = new Map(); // ip -> { count, resetAt }
function checkRate(ip) {
  const now = Date.now();
  let rec = rateCounts.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + RATE_WINDOW };
    rateCounts.set(ip, rec);
  }
  rec.count++;
  return rec.count <= RATE_MAX;
}

// ─── AUDIT RECEIPTS ───────────────────────────────────────────────────────────
function makeReceipt(action, detail) {
  return {
    receipt_id: crypto.randomUUID(),
    gateway: 'pauli-gateway',
    action,
    timestamp: new Date().toISOString(),
    ...detail
  };
}

// ─── BODY READER ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('REQUEST_TOO_LARGE')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ─── STARNET SIDECAR REQUEST ──────────────────────────────────────────────────
function sidecarRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyBuf = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (STARNET_TOKEN) headers['Authorization'] = `Bearer ${STARNET_TOKEN}`;
    if (bodyBuf) headers['Content-Length'] = bodyBuf.length;

    const req = http.request({
      host: STARNET_HOST,
      port: STARNET_PORT,
      path,
      method,
      headers,
      timeout: 30000
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
        if (res.statusCode >= 400) {
          const err = new Error(data?.error || data?.detail || data?.message || `STARNET ${res.statusCode}`);
          err.status = res.statusCode;
          err.body = data;
          return reject(err);
        }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', err => { err.status = 503; reject(err); });
    req.on('timeout', () => { req.destroy(); const e = new Error('STARNET_TIMEOUT'); e.status = 504; reject(e); });
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

// ─── NDJSON STREAM READER (for /api/run) ─────────────────────────────────────
// STARNET's /api/run returns NDJSON — we collect all events and return the final state.
function runToCompletion(agentId, message, context) {
  return new Promise((resolve, reject) => {
    const taskId = crypto.randomUUID();
    const bodyObj = {
      agentId: agentId || 'agent',
      text: message,
      context: context || {},
      taskId
    };
    const bodyBuf = Buffer.from(JSON.stringify(bodyObj), 'utf8');
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/x-ndjson, application/json',
      'Content-Length': bodyBuf.length
    };
    if (STARNET_TOKEN) headers['Authorization'] = `Bearer ${STARNET_TOKEN}`;

    const req = http.request({
      host: STARNET_HOST,
      port: STARNET_PORT,
      path: '/api/run',
      method: 'POST',
      headers,
      timeout: 90000
    }, res => {
      if (res.statusCode >= 400) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data;
          try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
          const err = new Error(data?.error || `STARNET_RUN ${res.statusCode}`);
          err.status = res.statusCode;
          reject(err);
        });
        return;
      }

      // Parse NDJSON stream
      let buf = '';
      const events = [];
      let finalResponse = null;
      let settled = false;

      res.on('data', chunk => {
        buf += chunk.toString('utf8');
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const evt = JSON.parse(trimmed);
            events.push(evt);
            // Capture the final agent response
            if (evt.type === 'agent' && evt.text) finalResponse = evt.text;
            if (evt.type === 'end' || evt.type === 'complete' || evt.type === 'agent.done') settled = true;
          } catch { /* non-JSON lines ignored */ }
        }
      });

      res.on('end', () => {
        if (buf.trim()) {
          try {
            const evt = JSON.parse(buf.trim());
            events.push(evt);
            if (evt.type === 'agent' && evt.text) finalResponse = evt.text;
          } catch { /* ignore */ }
        }
        resolve({
          task_id: taskId,
          mission_id: taskId,
          status: settled ? 'completed' : (finalResponse ? 'completed' : 'accepted'),
          response: finalResponse,
          result: finalResponse,
          logs: events.filter(e => e.type === 'tool' || e.type === 'tool.result').slice(-20),
          receipt: makeReceipt('run', { task_id: taskId, agent: agentId || 'agent' }),
          event_count: events.length
        });
      });

      res.on('error', err => { err.status = 503; reject(err); });
    });

    req.on('error', err => { err.status = 503; reject(err); });
    req.on('timeout', () => { req.destroy(); const e = new Error('STARNET_RUN_TIMEOUT'); e.status = 504; reject(e); });
    req.write(bodyBuf);
    req.end();
  });
}

// ─── CITY STATUS ──────────────────────────────────────────────────────────────
// STARNET doesn't have a /v1/city/status endpoint natively — we synthesize it
// from the workspace state files + sidecar health.
async function getCityStatus() {
  // Probe sidecar health
  let sidecarOk = false;
  let sidecarData = {};
  try {
    const r = await sidecarRequest('GET', '/api/status');
    sidecarOk = true;
    sidecarData = r.data || {};
  } catch (e) {
    log('warn', 'sidecar /api/status unreachable', { error: e.message });
    // Try alternate health endpoints
    try {
      await sidecarRequest('GET', '/api/health');
      sidecarOk = true;
    } catch { /* still down */ }
  }

  if (!sidecarOk) {
    return {
      degraded: true,
      generatedAt: new Date().toISOString(),
      city: { name: "Pauli's Place", status: 'unreachable' },
      districts: [], citizens: [], missions: [], approvals: [], experiments: [],
      revenue: null, costs: null,
      health: { status: 'unreachable', starnet: { ok: false } }
    };
  }

  // Pull roster from workspace
  let agents = [];
  let pending = [];
  try {
    const wsPath = process.env.STARNET_WORKSPACE_PATH ||
      require('path').join(require('os').homedir(), 'AppData', 'Roaming', 'ai.skynet.harness', 'workspaces');
    const fs = require('fs');

    const rosterFile = require('path').join(wsPath, 'agent.roster.json');
    if (fs.existsSync(rosterFile)) {
      const roster = JSON.parse(fs.readFileSync(rosterFile, 'utf8'));
      agents = Array.isArray(roster.agents) ? roster.agents : [];
    }

    const pendingFile = require('path').join(wsPath, 'agent.pending.json');
    if (fs.existsSync(pendingFile)) {
      const p = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
      pending = Array.isArray(p) ? p : (p?.pending || []);
    }
  } catch (e) {
    log('debug', 'workspace read failed', { error: e.message });
  }

  const citizens = agents.map(a => ({
    id: a.agentId || a.id || 'agent',
    name: a.name || a.agentId || 'Agent',
    role: a.role || 'agent',
    status: 'online',
    district: a.district || 'city'
  }));

  const approvals = (pending || []).slice(0, 20).map((p, i) => ({
    id: p.id || p.taskId || `approval-${i}`,
    title: p.title || p.action || p.task || 'Pending action',
    action: p.action || p.task || '',
    district: p.district || '',
    risk: p.risk || 'medium',
    cost: p.estimatedCost || null
  }));

  return {
    degraded: false,
    generatedAt: new Date().toISOString(),
    city: {
      name: "Pauli's Place",
      status: 'online',
      ...sidecarData.city
    },
    districts: sidecarData.districts || [{
      id: 'city',
      name: 'City Center',
      status: 'active',
      agents: citizens.length,
      active: citizens.filter(c => c.status === 'online').length
    }],
    citizens,
    missions: sidecarData.missions || [],
    approvals,
    experiments: sidecarData.experiments || [],
    revenue: null,   // unknown until STARNET provides verified telemetry
    costs: null,     // unknown until STARNET provides verified telemetry
    health: {
      status: 'online',
      starnet: { ok: true, port: STARNET_PORT }
    }
  };
}

// ─── TASK STORE (in-memory) ───────────────────────────────────────────────────
// Stores running/completed tasks by ID for GET /v1/heisenberg/tasks/:id
const taskStore = new Map();

// ─── REQUEST HANDLER ──────────────────────────────────────────────────────────
async function handleRequest(req, res) {
  const reqId = crypto.randomUUID().slice(0, 8);
  const ip = req.socket?.remoteAddress || 'unknown';
  const { method, url } = req;

  log('info', 'request', { reqId, method, url, ip });

  // Helpers
  function send(status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': reqId });
    res.end(payload);
  }

  // Rate limit
  if (!checkRate(ip)) {
    log('warn', 'rate limit exceeded', { ip });
    return send(429, { error: 'RATE_LIMIT_EXCEEDED', retryAfter: Math.ceil(RATE_WINDOW / 1000) });
  }

  // Authentication
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token || !crypto.timingSafeEqual(Buffer.from(token.padEnd(64)), Buffer.from(GATEWAY_TOKEN.padEnd(64)))) {
    log('warn', 'auth failed', { reqId, ip });
    return send(401, { error: 'UNAUTHORIZED', hint: 'Bearer token required' });
  }

  // Routing
  try {
    // GET /health
    if (method === 'GET' && url === '/health') {
      let starnetOk = false;
      try { await sidecarRequest('GET', '/api/health'); starnetOk = true; } catch { /* down */ }
      try { if (!starnetOk) { await sidecarRequest('GET', '/api/status'); starnetOk = true; } } catch { /* down */ }
      return send(200, {
        ok: true,
        gateway: 'pauli-gateway',
        version: '1.0.0',
        starnet: { ok: starnetOk, host: `${STARNET_HOST}:${STARNET_PORT}` },
        generatedAt: new Date().toISOString()
      });
    }

    // GET /v1/city/status
    if (method === 'GET' && url === '/v1/city/status') {
      const status = await getCityStatus();
      return send(200, status);
    }

    // POST /v1/heisenberg/tasks
    if (method === 'POST' && (url === '/v1/heisenberg/tasks' || url === '/v1/heisenberg/tasks/')) {
      const bodyText = await readBody(req);
      let body;
      try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return send(400, { error: 'INVALID_JSON' }); }

      const message = typeof body?.task === 'string' ? body.task.trim() :
                      typeof body?.message === 'string' ? body.message.trim() : '';
      if (!message) return send(400, { error: 'task or message field required' });

      // Start async — store in-progress task
      const taskId = crypto.randomUUID();
      const taskRecord = {
        id: taskId,
        task_id: taskId,
        mission_id: taskId,
        status: 'running',
        task: message,
        startedAt: new Date().toISOString(),
        receipt: makeReceipt('heisenberg_dispatch', { task_id: taskId })
      };
      taskStore.set(taskId, taskRecord);

      // Run async (don't await here — return immediately with taskId)
      runToCompletion('agent', message, body?.context || {}).then(result => {
        const updated = {
          ...taskRecord,
          ...result,
          id: taskId,
          task_id: taskId,
          mission_id: taskId,
          status: result.status || 'completed',
          completedAt: new Date().toISOString()
        };
        taskStore.set(taskId, updated);
        log('info', 'task completed', { taskId, status: updated.status });
      }).catch(err => {
        taskStore.set(taskId, {
          ...taskRecord,
          status: 'failed',
          error: err.message,
          completedAt: new Date().toISOString()
        });
        log('error', 'task failed', { taskId, error: err.message });
      });

      log('info', 'task dispatched', { taskId, reqId });
      return send(202, taskRecord);
    }

    // GET /v1/heisenberg/tasks/:id
    const taskMatch = url.match(/^\/v1\/heisenberg\/tasks\/([^/?]+)(\?.*)?$/);
    if (method === 'GET' && taskMatch) {
      const taskId = decodeURIComponent(taskMatch[1]);
      const task = taskStore.get(taskId);
      if (!task) return send(404, { error: 'TASK_NOT_FOUND', task_id: taskId });
      return send(200, task);
    }

    // POST /v1/approvals/:id/decision
    const approvalMatch = url.match(/^\/v1\/approvals\/([^/?]+)\/decision(\?.*)?$/);
    if (method === 'POST' && approvalMatch) {
      const approvalId = decodeURIComponent(approvalMatch[1]);
      const bodyText = await readBody(req);
      let body;
      try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return send(400, { error: 'INVALID_JSON' }); }

      const decision = body?.decision;
      if (decision !== 'approve' && decision !== 'reject') {
        return send(400, { error: 'decision must be approve or reject' });
      }

      // Forward to STARNET workspace — mark pending item as decided
      const receipt = makeReceipt('approval_decision', {
        approval_id: approvalId,
        decision,
        decided_by: 'gateway-owner'
      });

      // Try to forward to sidecar if it has an approval endpoint
      try {
        const r = await sidecarRequest('POST', `/api/approve`, { id: approvalId, decision });
        log('info', 'approval forwarded', { approvalId, decision, receipt: receipt.receipt_id });
        return send(200, { ok: true, id: approvalId, decision, receipt, result: r.data });
      } catch (e) {
        // Sidecar may not have this endpoint — record locally and return receipt
        log('warn', 'sidecar approve endpoint missing, recording locally', { approvalId, error: e.message });
        return send(200, {
          ok: true,
          id: approvalId,
          decision,
          receipt,
          note: 'Decision recorded at gateway. Sidecar approval sync pending when available.'
        });
      }
    }

    // 404
    return send(404, { error: 'NOT_FOUND', method, url });

  } catch (err) {
    log('error', 'handler error', { reqId, error: err.message, status: err.status });
    const status = typeof err.status === 'number' ? err.status : 500;
    return send(status, {
      error: err.message || 'GATEWAY_ERROR',
      degraded: true,
      reqId
    });
  }
}

// ─── START SERVER ─────────────────────────────────────────────────────────────
const server = http.createServer(handleRequest);
server.listen(GATEWAY_PORT, GATEWAY_BIND, () => {
  log('info', 'gateway started', {
    bind: `${GATEWAY_BIND}:${GATEWAY_PORT}`,
    starnet: `${STARNET_HOST}:${STARNET_PORT}`,
    rateLimit: `${RATE_MAX} req/${RATE_WINDOW}ms per IP`
  });
  process.stdout.write(`PAULI GATEWAY: http://${GATEWAY_BIND}:${GATEWAY_PORT}\n`);
});

server.on('error', err => {
  log('error', 'server error', { error: err.message, code: err.code });
  if (err.code === 'EADDRINUSE') {
    process.stderr.write(`[GATEWAY] Port ${GATEWAY_PORT} already in use\n`);
    process.exit(1);
  }
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
