'use strict';

const http = require('http');
const crypto = require('crypto');
const { makeWorkforceControlPlane } = require('../sidecar/workforce/index.js');

const TOKEN = process.env.GATEWAY_BEARER_TOKEN || '';
const PORT = parseInt(process.env.GATEWAY_PORT || '4000', 10);
const HOST = process.env.GATEWAY_HOST || '127.0.0.1';
const UPSTREAM_PORT = parseInt(process.env.GATEWAY_LEGACY_PORT || '4001', 10);
const STARNET_PORT = parseInt(process.env.STARNET_PORT || '8787', 10);
const STARNET_TOKEN = process.env.STARNET_SIDECAR_TOKEN || process.env.STARNET_API_TOKEN || '';
const MAX_BODY = parseInt(process.env.MAX_BODY_BYTES || '1048576', 10);

if (!TOKEN) {
  process.stderr.write('[WORKFORCE][FATAL] GATEWAY_BEARER_TOKEN is required.\n');
  process.exit(1);
}

const plane = makeWorkforceControlPlane({
  env: process.env,
  id: () => 'mission-' + crypto.randomUUID()
});
const missions = new Map();

function authorized(req) {
  const raw = String(req.headers.authorization || '');
  const got = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!got) return false;
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(TOKEN).digest();
  return crypto.timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('REQUEST_TOO_LARGE'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': payload.length });
  res.end(payload);
}

function proxyLegacy(req, res) {
  const headers = Object.assign({}, req.headers, { host: '127.0.0.1:' + UPSTREAM_PORT });
  const upstream = http.request({
    host: '127.0.0.1', port: UPSTREAM_PORT, method: req.method, path: req.url, headers, timeout: 120000
  }, r => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
  });
  upstream.on('error', e => send(res, 503, { error: 'LEGACY_GATEWAY_UNREACHABLE', detail: e.message }));
  upstream.on('timeout', () => { upstream.destroy(); send(res, 504, { error: 'LEGACY_GATEWAY_TIMEOUT' }); });
  req.pipe(upstream);
}

function runSidecar(agentId, objective, context, taskId) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify({ agentId, text: objective, context: context || {}, taskId }), 'utf8');
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/x-ndjson, application/json',
      'Content-Length': body.length
    };
    // sidecar /api/run authenticates via X-StarNet-Token (see sidecar/apiauth.js), not Authorization.
    if (STARNET_TOKEN) { headers['X-StarNet-Token'] = STARNET_TOKEN; headers.Authorization = 'Bearer ' + STARNET_TOKEN; }
    const r = http.request({
      host: '127.0.0.1', port: STARNET_PORT, path: '/api/run', method: 'POST', headers, timeout: 90000
    }, res => {
      if ((res.statusCode || 500) >= 400) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => reject(Object.assign(new Error('STARNET_RUN_' + res.statusCode), { status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') })));
        return;
      }
      let buf = '';
      const events = [];
      let finalText = null;
      res.on('data', chunk => {
        buf += chunk.toString('utf8');
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            events.push(evt);
            if (evt.type === 'agent' && evt.text) finalText = evt.text;
          } catch (_) {}
        }
      });
      res.on('end', () => resolve({ result: finalText, eventCount: events.length, events: events.slice(-40) }));
      res.on('error', reject);
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(Object.assign(new Error('STARNET_RUN_TIMEOUT'), { status: 504 })); });
    r.end(body);
  });
}

async function handle(req, res) {
  if (!authorized(req)) return send(res, 401, { error: 'UNAUTHORIZED' });
  const path = String(req.url || '').split('?')[0];

  try {
    if (req.method === 'GET' && path === '/v1/workforce/status') {
      return send(res, 200, plane.snapshot());
    }

    const agentMatch = path.match(/^\/v1\/workforce\/agents\/([^/]+)\/plan$/);
    if (req.method === 'GET' && agentMatch) {
      return send(res, 200, plane.planAgent(decodeURIComponent(agentMatch[1])));
    }

    if (req.method === 'POST' && path === '/v1/workforce/missions/plan') {
      const raw = await readBody(req);
      let body;
      try { body = raw ? JSON.parse(raw) : {}; } catch (_) { return send(res, 400, { error: 'INVALID_JSON' }); }
      return send(res, 200, plane.planMission({
        agentId: body.agentId,
        projectId: body.projectId,
        objective: body.objective || body.task || body.message,
        budgetUsd: body.budgetUsd,
        requiresHumanApproval: body.requiresHumanApproval,
        executionLane: body.executionLane
      }));
    }

    if (req.method === 'POST' && path === '/v1/workforce/missions') {
      const raw = await readBody(req);
      let body;
      try { body = raw ? JSON.parse(raw) : {}; } catch (_) { return send(res, 400, { error: 'INVALID_JSON' }); }
      const planned = plane.planMission({
        agentId: body.agentId,
        projectId: body.projectId,
        objective: body.objective || body.task || body.message,
        budgetUsd: body.budgetUsd,
        requiresHumanApproval: body.requiresHumanApproval,
        executionLane: body.executionLane
      });
      if (!planned.plan.ok) return send(res, 409, { error: planned.plan.computer.blocker || 'MISSION_BLOCKED', planned });
      if (planned.plan.approvalRequired) return send(res, 409, { error: 'HUMAN_APPROVAL_REQUIRED', planned });

      const id = planned.mission.id;
      const record = {
        id,
        mission: planned.mission,
        plan: planned.plan,
        status: 'running',
        startedAt: new Date().toISOString(),
        receipt: { id: crypto.randomUUID(), type: 'workforce-dispatch', agentId: planned.mission.agentId }
      };
      missions.set(id, record);
      runSidecar(planned.mission.agentId, planned.mission.objective, {
        workforce: { plan: planned.plan, projectId: planned.mission.projectId },
        callerContext: body.context || {}
      }, id).then(result => {
        missions.set(id, Object.assign({}, record, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          result: result.result,
          evidence: {
            kind: 'starnet-run-receipt',
            verified: true,
            eventCount: result.eventCount,
            eventTail: result.events
          }
        }));
      }).catch(err => {
        missions.set(id, Object.assign({}, record, {
          status: 'failed', completedAt: new Date().toISOString(), error: err.message
        }));
      });
      return send(res, 202, record);
    }

    const missionMatch = path.match(/^\/v1\/workforce\/missions\/([^/]+)$/);
    if (req.method === 'GET' && missionMatch) {
      const id = decodeURIComponent(missionMatch[1]);
      const record = missions.get(id);
      if (!record) return send(res, 404, { error: 'MISSION_NOT_FOUND', id });
      return send(res, 200, record);
    }

    // Existing city, approvals and Heisenberg routes remain owned by the proven gateway.
    return proxyLegacy(req, res);
  } catch (e) {
    return send(res, Number(e.status || 500), { error: e.message || 'WORKFORCE_GATEWAY_ERROR' });
  }
}

const server = http.createServer(handle);
server.listen(PORT, HOST, () => {
  process.stdout.write('PAULI WORKFORCE GATEWAY: http://' + HOST + ':' + PORT + '\n');
});
server.on('error', e => {
  process.stderr.write('[WORKFORCE][SERVER] ' + e.message + '\n');
  if (e.code === 'EADDRINUSE') process.exit(1);
});

module.exports = { server, plane, _internals: { authorized, readBody, proxyLegacy, runSidecar } };
