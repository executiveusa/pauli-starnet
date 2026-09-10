'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const {
  CITY_ARCHITECTURE_VERSION,
  COMPANY_SPACES,
  projectDistricts,
} = require('./city-manifest');

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
  process.stderr.write('[GATEWAY][FATAL] GATEWAY_BEARER_TOKEN is not set.\n');
  process.exit(1);
}

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const logLevel = LEVELS[LOG_LEVEL] ?? 1;
function log(level, msg, data) {
  if ((LEVELS[level] ?? 1) < logLevel) return;
  const entry = { t: new Date().toISOString(), level, msg };
  if (data) Object.assign(entry, data);
  process.stderr.write(JSON.stringify(entry) + '\n');
}

const rateCounts = new Map();
function checkRate(ip) {
  const now = Date.now();
  let rec = rateCounts.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + RATE_WINDOW };
    rateCounts.set(ip, rec);
  }
  rec.count += 1;
  return rec.count <= RATE_MAX;
}

function makeReceipt(action, detail) {
  return {
    receipt_id: crypto.randomUUID(),
    gateway: 'pauli-gateway',
    action,
    timestamp: new Date().toISOString(),
    ...detail,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('REQUEST_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sidecarHeaders(bodyBuf, accept = 'application/json') {
  const headers = { 'Content-Type': 'application/json', Accept: accept };
  if (STARNET_TOKEN) {
    headers['X-StarNet-Token'] = STARNET_TOKEN;
    headers.Authorization = `Bearer ${STARNET_TOKEN}`;
  }
  if (bodyBuf) headers['Content-Length'] = bodyBuf.length;
  return headers;
}

function sidecarRequest(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const bodyBuf = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const req = http.request({
      host: STARNET_HOST,
      port: STARNET_PORT,
      path: requestPath,
      method,
      headers: sidecarHeaders(bodyBuf),
      timeout: 30000,
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
        if ((res.statusCode || 500) >= 400) {
          const err = new Error(data?.error || data?.detail || data?.message || `STARNET ${res.statusCode}`);
          err.status = res.statusCode;
          err.body = data;
          reject(err);
          return;
        }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', err => { err.status = 503; reject(err); });
    req.on('timeout', () => {
      req.destroy();
      const err = new Error('STARNET_TIMEOUT');
      err.status = 504;
      reject(err);
    });
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

function runToCompletion(agentId, message, context) {
  return new Promise((resolve, reject) => {
    const taskId = crypto.randomUUID();
    const resolvedProvider = context?.provider || process.env.STARNET_DEFAULT_PROVIDER || 'openrouter';
    const resolvedModel = context?.model || process.env.STARNET_DEFAULT_MODEL || 'meta-llama/llama-3.3-70b-instruct';
    const resolvedKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API || '';
    const body = {
      agentId: agentId || 'agent',
      text: message,
      messages: [{ role: 'user', content: message }],
      provider: resolvedProvider,
      model: resolvedModel,
      key: resolvedKey,
      context: context || {},
      taskId,
    };
    const bodyBuf = Buffer.from(JSON.stringify(body), 'utf8');
    const req = http.request({
      host: STARNET_HOST,
      port: STARNET_PORT,
      path: '/api/run',
      method: 'POST',
      headers: sidecarHeaders(bodyBuf, 'application/x-ndjson, application/json'),
      timeout: 90000,
    }, res => {
      if ((res.statusCode || 500) >= 400) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data;
          try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
          const raw = typeof data?.raw === 'string' ? data.raw.trim().slice(0, 200) : '';
          const err = new Error(data?.error || (raw ? `STARNET_RUN ${res.statusCode}: ${raw}` : `STARNET_RUN ${res.statusCode}`));
          err.status = res.statusCode;
          reject(err);
        });
        return;
      }

      let buf = '';
      const events = [];
      let accumulatedTokens = '';
      let finalResponse = null;
      let runError = null;
      let costInfo = null;
      let settled = false;

      function capture(evt) {
        events.push(evt);
        const name = evt.name || evt.type;
        const payload = evt.payload || evt;
        if (name === 'agent.token' && payload.delta) accumulatedTokens += payload.delta;
        if (name === 'agent.cost' || name === 'cost.estimate') costInfo = payload;
        if (name === 'agent.run.error') runError = payload.message || 'Unknown agent error';
        if (name === 'agent.run.end') {
          settled = payload.reason === 'done';
          if (payload.reason === 'error' && !runError) runError = 'Run ended with error';
        }
        if (evt.type === 'agent' && evt.text) finalResponse = evt.text;
        if (evt.type === 'end' || evt.type === 'complete' || evt.type === 'agent.done') settled = true;
      }

      res.on('data', chunk => {
        buf += chunk.toString('utf8');
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try { capture(JSON.parse(trimmed)); } catch { /* ignore non-JSON line */ }
        }
      });

      res.on('end', () => {
        if (buf.trim()) {
          try { capture(JSON.parse(buf.trim())); } catch { /* ignore */ }
        }
        const outText = finalResponse || accumulatedTokens || null;
        if (runError) {
          const err = new Error(runError);
          err.status = 500;
          err.partialResponse = outText;
          reject(err);
          return;
        }
        resolve({
          task_id: taskId,
          mission_id: taskId,
          status: settled ? 'completed' : 'working',
          response: settled ? outText : null,
          result: settled ? outText : null,
          partial_response: settled ? null : outText,
          cost: costInfo,
          logs: events.filter(event => String(event.name || event.type || '').startsWith('tool')).slice(-20),
          receipt: makeReceipt('run', { task_id: taskId, agent: agentId || 'agent', model: resolvedModel }),
          event_count: events.length,
        });
      });
      res.on('error', err => { err.status = 503; reject(err); });
    });

    req.on('error', err => { err.status = 503; reject(err); });
    req.on('timeout', () => {
      req.destroy();
      const err = new Error('STARNET_RUN_TIMEOUT');
      err.status = 504;
      reject(err);
    });
    req.write(bodyBuf);
    req.end();
  });
}

async function getCityStatus() {
  let sidecarOk = false;
  let sidecarData = {};
  try {
    const response = await sidecarRequest('GET', '/api/status');
    sidecarOk = true;
    sidecarData = response.data || {};
  } catch (error) {
    log('warn', 'sidecar /api/status unreachable', { error: error.message });
    try {
      await sidecarRequest('GET', '/api/health');
      sidecarOk = true;
    } catch { /* still down */ }
  }

  if (!sidecarOk) {
    return {
      degraded: true,
      generatedAt: new Date().toISOString(),
      architectureVersion: CITY_ARCHITECTURE_VERSION,
      city: { name: "Pauli's Place", status: 'unreachable' },
      districts: [],
      companySpaces: COMPANY_SPACES,
      citizens: [],
      missions: [],
      approvals: [],
      experiments: [],
      revenue: null,
      costs: null,
      health: { status: 'unreachable', starnet: { ok: false } },
    };
  }

  let agents = [];
  let pending = [];
  try {
    const workspacePath = process.env.STARNET_WORKSPACE_PATH || path.join(os.homedir(), 'AppData', 'Roaming', 'ai.skynet.harness', 'workspaces');
    const rosterFile = path.join(workspacePath, 'agent.roster.json');
    const pendingFile = path.join(workspacePath, 'agent.pending.json');
    if (fs.existsSync(rosterFile)) {
      const roster = JSON.parse(fs.readFileSync(rosterFile, 'utf8'));
      agents = Array.isArray(roster.agents) ? roster.agents : [];
    }
    if (fs.existsSync(pendingFile)) {
      const parsed = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
      pending = Array.isArray(parsed) ? parsed : (parsed?.pending || []);
    }
  } catch (error) {
    log('debug', 'workspace read failed', { error: error.message });
  }

  const citizens = agents.map(agent => ({
    id: agent.agentId || agent.id || 'agent',
    name: agent.name || agent.agentId || 'Agent',
    role: agent.role || 'agent',
    status: agent.status || 'online',
    district: agent.district || null,
  }));
  const missions = Array.isArray(sidecarData.missions) ? sidecarData.missions : [];
  const runtimeDistricts = Array.isArray(sidecarData.districts) ? sidecarData.districts : [];
  const approvals = pending.slice(0, 20).map((item, index) => ({
    id: item.id || item.taskId || `approval-${index}`,
    title: item.title || item.action || item.task || 'Pending action',
    action: item.action || item.task || '',
    district: item.district || '',
    risk: item.risk || 'medium',
    cost: item.estimatedCost ?? null,
  }));

  return {
    degraded: false,
    generatedAt: new Date().toISOString(),
    architectureVersion: CITY_ARCHITECTURE_VERSION,
    city: { name: "Pauli's Place", status: 'online', ...sidecarData.city },
    districts: projectDistricts(runtimeDistricts, citizens, missions),
    companySpaces: COMPANY_SPACES,
    citizens,
    missions,
    approvals,
    experiments: Array.isArray(sidecarData.experiments) ? sidecarData.experiments : [],
    revenue: sidecarData.revenue ?? null,
    costs: sidecarData.costs ?? null,
    health: { status: 'online', starnet: { ok: true, port: STARNET_PORT } },
  };
}

const taskStore = new Map();

function safeTokenEquals(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function handleRequest(req, res) {
  const reqId = crypto.randomUUID().slice(0, 8);
  const ip = req.socket?.remoteAddress || 'unknown';
  const { method, url } = req;

  function send(status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': reqId });
    res.end(payload);
  }

  log('info', 'request', { reqId, method, url, ip });
  if (!checkRate(ip)) return send(429, { error: 'RATE_LIMIT_EXCEEDED', retryAfter: Math.ceil(RATE_WINDOW / 1000) });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!safeTokenEquals(token, GATEWAY_TOKEN)) return send(401, { error: 'UNAUTHORIZED', hint: 'Bearer token required' });

  try {
    if (method === 'GET' && url === '/health') {
      let starnetOk = false;
      try { await sidecarRequest('GET', '/api/health'); starnetOk = true; } catch { /* fall through */ }
      try { if (!starnetOk) { await sidecarRequest('GET', '/api/status'); starnetOk = true; } } catch { /* down */ }
      return send(200, {
        ok: true,
        gateway: 'pauli-gateway',
        version: '1.1.0',
        cityArchitecture: CITY_ARCHITECTURE_VERSION,
        starnet: { ok: starnetOk, host: `${STARNET_HOST}:${STARNET_PORT}` },
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === 'GET' && url === '/v1/city/status') return send(200, await getCityStatus());

    if (method === 'POST' && (url === '/v1/heisenberg/tasks' || url === '/v1/heisenberg/tasks/')) {
      const bodyText = await readBody(req);
      let body;
      try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return send(400, { error: 'INVALID_JSON' }); }
      const message = typeof body.task === 'string' ? body.task.trim() : typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) return send(400, { error: 'task or message field required' });

      const taskId = crypto.randomUUID();
      const taskRecord = {
        id: taskId,
        task_id: taskId,
        mission_id: taskId,
        status: 'running',
        task: message,
        startedAt: new Date().toISOString(),
        receipt: makeReceipt('heisenberg_dispatch', { task_id: taskId }),
      };
      taskStore.set(taskId, taskRecord);

      runToCompletion('agent', message, body.context || {}).then(result => {
        const updated = {
          ...taskRecord,
          ...result,
          id: taskId,
          task_id: taskId,
          mission_id: taskId,
          status: result.status,
          updatedAt: new Date().toISOString(),
        };
        if (result.status === 'completed') updated.completedAt = new Date().toISOString();
        taskStore.set(taskId, updated);
        log('info', 'task settled', { taskId, status: updated.status });
      }).catch(error => {
        taskStore.set(taskId, {
          ...taskRecord,
          status: 'failed',
          error: error.message,
          completedAt: new Date().toISOString(),
        });
        log('error', 'task failed', { taskId, error: error.message });
      });
      return send(202, taskRecord);
    }

    const taskMatch = url.match(/^\/v1\/heisenberg\/tasks\/([^/?]+)(\?.*)?$/);
    if (method === 'GET' && taskMatch) {
      const taskId = decodeURIComponent(taskMatch[1]);
      const task = taskStore.get(taskId);
      if (!task) return send(404, { error: 'TASK_NOT_FOUND', task_id: taskId, durability: 'gateway-memory-only' });
      return send(200, task);
    }

    const approvalMatch = url.match(/^\/v1\/approvals\/([^/?]+)\/decision(\?.*)?$/);
    if (method === 'POST' && approvalMatch) {
      const approvalId = decodeURIComponent(approvalMatch[1]);
      const bodyText = await readBody(req);
      let body;
      try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return send(400, { error: 'INVALID_JSON' }); }
      if (body.decision !== 'approve' && body.decision !== 'reject') return send(400, { error: 'decision must be approve or reject' });

      const receipt = makeReceipt('approval_decision_attempt', {
        approval_id: approvalId,
        decision: body.decision,
        decided_by: 'gateway-owner',
      });
      try {
        const result = await sidecarRequest('POST', '/api/approve', { id: approvalId, decision: body.decision });
        return send(200, { ok: true, id: approvalId, decision: body.decision, receipt, result: result.data });
      } catch (error) {
        log('warn', 'approval was not persisted by sidecar', { approvalId, error: error.message });
        return send(502, {
          ok: false,
          error: 'APPROVAL_NOT_PERSISTED',
          id: approvalId,
          decision: body.decision,
          receipt,
          detail: error.message,
        });
      }
    }

    return send(404, { error: 'NOT_FOUND', method, url });
  } catch (error) {
    log('error', 'handler error', { reqId, error: error.message, status: error.status });
    return send(typeof error.status === 'number' ? error.status : 500, {
      error: error.message || 'GATEWAY_ERROR',
      degraded: true,
      reqId,
    });
  }
}

const server = http.createServer(handleRequest);
server.listen(GATEWAY_PORT, GATEWAY_BIND, () => {
  log('info', 'gateway started', {
    bind: `${GATEWAY_BIND}:${GATEWAY_PORT}`,
    starnet: `${STARNET_HOST}:${STARNET_PORT}`,
    rateLimit: `${RATE_MAX} req/${RATE_WINDOW}ms per IP`,
  });
  process.stdout.write(`PAULI GATEWAY: http://${GATEWAY_BIND}:${GATEWAY_PORT}\n`);
});

server.on('error', error => {
  log('error', 'server error', { error: error.message, code: error.code });
  if (error.code === 'EADDRINUSE') process.exit(1);
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
