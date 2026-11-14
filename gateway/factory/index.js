'use strict';
// STARFACTORY-001: assembles the factory from environment configuration and exposes it as /v1/factory/* routes.
// Returns null when PAPERCLIP_URL is unset, so existing gateway behaviour is unchanged until it is configured.
//
//   PAPERCLIP_URL, PAPERCLIP_TOKEN, PAPERCLIP_COMPANY_ID   the one mission authority (board/service credential)
//   FACTORY_ROLES  JSON, agent ids by role; each worker may carry its OWN credential and its executor:
//     { "heisenberg": {"agentId":"..."},
//       "pi":     {"agentId":"...","apiKey":"<secret>","executor":{"type":"sidecar","agentId":"pi","port":8787}},
//       "hermes": {"agentId":"...","apiKey":"<secret>","executor":{"type":"http","url":"http://127.0.0.1:PORT/run"}},
//       "qa":     {"agentId":"...","apiKey":"<secret>","executor":{"type":"sidecar","agentId":"qa"}} }
//   FACTORY_WORKER_TOKEN   bearer Paperclip's http adapter presents on wake (separate from the owner token)
//   FACTORY_STATE_DIR      receipts/checkpoints/stop flag (default ./.starfactory-state)
const crypto = require('crypto');
const path = require('path');
const { makePaperclipClient } = require('./paperclip-client.js');
const { makeStateStore } = require('./state-store.js');
const { makeHeisenberg } = require('./heisenberg.js');
const { makeWorkerBridge } = require('./worker-bridge.js');
const { makeProjection } = require('./projection.js');
const { makeSidecarExecutor, makeHttpExecutor } = require('./executors.js');

function tokenOk(req, expected) {
  if (!expected) return false; // fail closed when unconfigured
  const raw = String(req.headers.authorization || '');
  const got = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!got) return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(got).digest(), crypto.createHash('sha256').update(expected).digest());
}

function makeExecutor(spec) {
  if (!spec) return null;
  if (spec.type === 'sidecar') return makeSidecarExecutor(spec);
  if (spec.type === 'http') return makeHttpExecutor(spec);
  throw new Error('unknown executor type: ' + spec.type);
}

function makeFactory({ env = process.env, fetchImpl, log = () => {}, overrides = {} } = {}) {
  if (!env.PAPERCLIP_URL && !overrides.client) return null;
  const roles = overrides.roles || JSON.parse(env.FACTORY_ROLES || '{}');
  const client = overrides.client || makePaperclipClient({ baseUrl: env.PAPERCLIP_URL, token: env.PAPERCLIP_TOKEN, companyId: env.PAPERCLIP_COMPANY_ID, fetchImpl });
  const store = overrides.store || makeStateStore(env.FACTORY_STATE_DIR || path.join(process.cwd(), '.starfactory-state'));
  let projection; // created below; Heisenberg reports handoffs to it as he creates them
  const heisenberg = makeHeisenberg({ client, roles, store, log: (e, d) => { if (e === 'handoff' && projection) projection.noteHandoff({ mission: d.mission, stage: d.stage, seq: d.seq, to: d.to, issueId: d.issueId }); log(e, d); } });
  const clientCache = new Map();
  const clientFor = overrides.clientFor || ((key) => {
    const r = roles[key];
    if (!r || !r.apiKey) return client;                  // no per-agent credential: falls back to the service credential
    if (!clientCache.has(key)) clientCache.set(key, makePaperclipClient({ baseUrl: env.PAPERCLIP_URL, token: r.apiKey, companyId: env.PAPERCLIP_COMPANY_ID, fetchImpl }));
    return clientCache.get(key);
  });
  const executors = overrides.executors || {};
  if (!overrides.executors) for (const [k, r] of Object.entries(roles)) { const e = makeExecutor(r.executor); if (e) executors[k] = e; }
  const bridge = makeWorkerBridge({ roles, clientFor, executors, store, heisenberg, log });
  projection = makeProjection({ client, roles, store });
  const workerToken = env.FACTORY_WORKER_TOKEN || '';
  let timers = [];

  async function readJson(req, helpers) {
    const raw = await helpers.readBody(req);
    try { return raw ? JSON.parse(raw) : {}; } catch { helpers.send(null, 400, { error: 'INVALID_JSON' }); return undefined; }
  }

  // Returns true when the request belonged to the factory. `owner` routes were already gated by the caller's bearer.
  async function handle(req, res, urlPath, helpers) {
    if (!urlPath.startsWith('/v1/factory/')) return false;
    const send = (code, body) => helpers.send(res, code, body);

    // Worker wake: authenticated by its OWN token (Paperclip presents it), never the owner token.
    const wake = /^\/v1\/factory\/wake\/([a-z0-9_-]{1,32})$/.exec(urlPath);
    if (wake && req.method === 'POST') {
      if (!tokenOk(req, workerToken)) { send(401, { error: 'UNAUTHORIZED' }); return true; }
      let body; try { body = JSON.parse((await helpers.readBody(req)) || '{}'); } catch { send(400, { error: 'INVALID_JSON' }); return true; }
      const r = bridge.accept(wake[1], body);
      if (r.done) r.done.catch(e => log('bridge_error', { error: e && e.message }));
      send(r.code, r.body);
      return true;
    }

    // Everything below is owner-only; the gateway's bearer gate has already run unless this is a test harness.
    if (helpers.requireOwner && !helpers.requireOwner(req)) { send(401, { error: 'UNAUTHORIZED' }); return true; }

    try {
      if (req.method === 'GET' && urlPath === '/v1/factory/state') { send(200, await projection.snapshot()); return true; }
      if (req.method === 'GET' && urlPath === '/v1/factory/events') { projection.subscribe(req, res); return true; }
      if (req.method === 'GET' && urlPath === '/v1/factory/missions') { send(200, { missions: await heisenberg.listMissions() }); return true; }
      const one = /^\/v1\/factory\/missions\/([A-Za-z0-9_.-]{1,100})$/.exec(urlPath);
      if (req.method === 'GET' && one) { const s = await heisenberg.status(one[1]); if (!s) send(404, { error: 'MISSION_NOT_FOUND' }); else send(200, s); return true; }
      if (req.method === 'POST' && urlPath === '/v1/factory/missions') {
        const body = await readJson(req, Object.assign({}, helpers, { send: (_r, c, b) => send(c, b) })); if (body === undefined) return true;
        const r = await heisenberg.submitMission(body); send(r.code, r.body); return true;
      }
      const act = /^\/v1\/factory\/missions\/([A-Za-z0-9_.-]{1,100})\/(authorize|accept)$/.exec(urlPath);
      if (req.method === 'POST' && act) {
        const body = await readJson(req, Object.assign({}, helpers, { send: (_r, c, b) => send(c, b) })); if (body === undefined) return true;
        const r = act[2] === 'authorize' ? await heisenberg.authorize(act[1], body) : await heisenberg.accept(act[1], body);
        send(r.code, r.body); return true;
      }
      if (req.method === 'POST' && urlPath === '/v1/factory/stop') { const body = (await readJson(req, Object.assign({}, helpers, { send: (_r, c, b) => send(c, b) }))) || {}; send(200, await heisenberg.emergencyStop(body)); return true; }
      if (req.method === 'POST' && urlPath === '/v1/factory/resume') { send(200, await heisenberg.resumeAll()); return true; }
      const ag = /^\/v1\/factory\/agents\/([a-z0-9_-]{1,32})\/(pause|resume)$/.exec(urlPath);
      if (req.method === 'POST' && ag) {
        const r = roles[ag[1]]; if (!r || !r.agentId) { send(404, { error: 'UNKNOWN_AGENT' }); return true; }
        send(200, ag[2] === 'pause' ? await client.pauseAgent(r.agentId) : await client.resumeAgent(r.agentId)); return true;
      }
      send(404, { error: 'NOT_FOUND' }); return true;
    } catch (e) {
      send(Number(e.status) >= 400 && Number(e.status) < 600 ? 502 : 500, { error: 'FACTORY_ERROR', detail: e.message }); return true;
    }
  }

  async function start({ reconcileMs = Number(env.FACTORY_RECONCILE_MS) || 60000, pollMs = Number(env.FACTORY_POLL_MS) || 3000 } = {}) {
    const recovered = await bridge.recover().catch(e => { log('recover_failed', { error: e.message }); return []; });
    timers.push(setInterval(() => heisenberg.reconcileAll().catch(e => log('reconcile_failed', { error: e.message })), reconcileMs));
    timers.push(setInterval(() => projection.poll().catch(e => log('poll_failed', { error: e.message })), pollMs));
    timers.forEach(t => t.unref && t.unref());
    return { recovered };
  }
  function stop() { timers.forEach(clearInterval); timers = []; }

  return { handle, start, stop, heisenberg, bridge, projection, store, client, roles };
}

module.exports = { makeFactory, tokenOk };
