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
const { actingChief, findStalls, DEFAULT_STALE_MS } = require('./command-chain.js');
const { loadCity, dueStanding, districtBoard } = require('./districts.js');
const { nextStep } = require('./pipelines.js');

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
  const heisenberg = makeHeisenberg({ client, roles, store, districtIds: overrides.districtIds || loadCity().map(d => d.id), log: (e, d) => { if (e === 'handoff' && projection) projection.noteHandoff({ mission: d.mission, stage: d.stage, seq: d.seq, to: d.to, issueId: d.issueId }); log(e, d); } });
  const clientCache = new Map();
  const clientFor = overrides.clientFor || ((key) => {
    const r = roles[key];
    if (!r || !r.apiKey) return client;                  // no per-agent credential: falls back to the service credential
    if (!clientCache.has(key)) clientCache.set(key, makePaperclipClient({ baseUrl: env.PAPERCLIP_URL, token: r.apiKey, companyId: env.PAPERCLIP_COMPANY_ID, fetchImpl }));
    return clientCache.get(key);
  });
  const executors = overrides.executors || {};
  if (!overrides.executors) for (const [k, r] of Object.entries(roles)) { const e = makeExecutor(r.executor); if (e) executors[k] = e; }
  const lanes = new Map();
  try { for (const d of (overrides.city || loadCity())) for (const c of d.citizens) if (c.model_lane) lanes.set(c.id, c.model_lane); } catch { /* no city */ }
  // Role keys pi/qa map to their roster names (pi-foundry, qa-judge) for lane lookup.
  const laneOf = (k) => lanes.get(k) || lanes.get({ pi: 'pi-foundry', qa: 'qa-judge' }[k]) || null;
  const modelRegistry = overrides.modelRegistry || (() => { try { return require('../../registry/models.json'); } catch { return null; } })();
  const bridge = makeWorkerBridge({ roles, clientFor, executors, store, heisenberg, log, routing: modelRegistry ? { registry: modelRegistry, laneOf } : null });
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
      if (req.method === 'GET' && urlPath === '/v1/factory/chief') { send(200, chiefNow()); return true; }
      if (req.method === 'POST' && urlPath === '/v1/factory/pipelines') {
        const body = await readJson(req, Object.assign({}, helpers, { send: (_r, c, b) => send(c, b) })); if (body === undefined) return true;
        const r = await startPipeline(body); send(r.code, r.body); return true;
      }
      const pa = /^\/v1\/factory\/pipelines\/([a-z0-9-]{1,40})\/([a-z0-9-]{1,40})\/(advance|status)$/.exec(urlPath);
      if (pa) {
        if (req.method === 'POST' && pa[3] === 'advance') { const r = await advancePipeline(pa[1], pa[2], { owner: true }); send(r.code, r.body); return true; }
        if (req.method === 'GET' && pa[3] === 'status') { const r = await advancePipeline(pa[1], pa[2], { dryRun: true }); send(r.code, r.body); return true; }
      }
      if (req.method === 'GET' && urlPath === '/v1/factory/districts') { send(200, { districts: await boardNow(), chief: chiefNow() }); return true; }
      if (req.method === 'POST' && urlPath === '/v1/factory/chief/heartbeat') {
        const body = (await readJson(req, Object.assign({}, helpers, { send: (_r, c, b) => send(c, b) }))) || {};
        if (body.by !== 'instinct') { send(400, { error: 'ONLY_INSTINCT_HEARTBEATS' }); return true; }
        store.putControl('chief', { instinctLastSeen: new Date().toISOString(), note: typeof body.note === 'string' ? body.note.slice(0, 200) : null });
        send(200, chiefNow()); return true;
      }
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

  const staleAfterMs = Number(env.CHIEF_STALE_MS) || DEFAULT_STALE_MS;
  function chiefNow() {
    const rec = store.getControl ? store.getControl('chief') : null;
    return actingChief({ now: new Date().toISOString(), instinctLastSeen: rec && rec.instinctLastSeen, staleAfterMs });
  }

  // Heisenberg's foreman sweep: assigned work that is not moving gets one nudge (re-wake), then an escalation to the
  // acting chief. Each step is recorded once so a restart never repeats it.
  async function foremanSweep() {
    if (store.isStopped()) return { skipped: 'stopped' };
    const open = await client.listIssues({ status: 'todo,in_progress' });
    const rows = Array.isArray(open) ? open : (open && (open.issues || open.items)) || [];
    const stalls = findStalls(rows, { now: new Date().toISOString(), ackMs: Number(env.STALL_ACK_MS) || undefined, escalateMs: Number(env.STALL_ESCALATE_MS) || undefined });
    const chief = chiefNow();
    const done = [];
    for (const s of stalls) {
      const key = 'stall-' + s.action + '-' + s.issueId;
      if (store.getControl(key)) continue;
      if (s.action === 'nudge') await client.invokeHeartbeat(s.agentId).catch(() => null);
      await client.addComment(s.issueId, { body: 'heisenberg-' + s.action + ': no movement for ' + s.idleMin + ' min' + (s.action === 'escalate' ? '; escalated to ' + chief.acting : '; re-woke the assignee') }).catch(() => null);
      store.putControl(key, { issueId: s.issueId, agentId: s.agentId });
      log('foreman_' + s.action, s); done.push(s);
    }
    const standing = await runStanding();
    const pipelines = await advanceAllPipelines();
    return { stalls: done, acting: chief.acting, standing, pipelines };
  }

  // Standing jobs from each district's contract: one mission per period for the named agent, judged by its roster
  // judge. Recorded once per period, so a restart never repeats one. Unready or unregistered agents are reported.
  async function runStanding(now = new Date().toISOString()) {
    const city = overrides.city || loadCity();
    const ran = new Set();
    const due = dueStanding(city, now, { has: (k) => ran.has(k) || !!store.getControl(standingKey(k)) });
    const out = [];
    for (const j of due) {
      ran.add(j.key);
      if (j.skip) { store.putControl(standingKey(j.key), { skipped: j.skip }); out.push({ key: j.key, skipped: j.skip }); continue; }
      const slug = j.job.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      const mid = (j.district + '.' + slug + '.' + j.key.split('|')[2]).slice(0, 100);
      const r = await heisenberg.submitMission({ mission_id: mid, user_intent: j.job + '. Done means: ' + j.outcome + '.', district: j.district,
        builder: j.builder, judge: j.judge, permissions: ['research'], budget_usd: Number(env.STANDING_JOB_BUDGET_USD) || 0.25,
        acceptance_criteria: [j.outcome], standing: j.key });
      store.putControl(standingKey(j.key), { mission_id: mid, code: r.code, error: r.body && r.body.error || null });
      out.push({ key: j.key, mission_id: mid, code: r.code, error: r.body && r.body.error || null });
      log('standing_job', { key: j.key, code: r.code });
    }
    return out;
  }
  function standingKey(k) { return 'standing-' + require('crypto').createHash('sha256').update(k).digest('hex').slice(0, 32); }

  // Pipelines (registry/pipelines.json): start a run, and advance it when a stage is done. Owner gates wait for
  // POST .../advance; the owner's release is recorded so a restart never forgets it.
  const pipelineDefs = overrides.pipelines || (() => { try { return require('../../registry/pipelines.json').pipelines; } catch { return {}; } })();
  async function startPipeline(body) {
    const def = pipelineDefs[body && body.pipeline];
    if (!def) return { code: 404, body: { error: 'UNKNOWN_PIPELINE', pipelines: Object.keys(pipelineDefs) } };
    if (!body.run || !/^[a-z0-9-]{1,40}$/.test(body.run)) return { code: 400, body: { error: 'run is required (lowercase, digits, dashes)' } };
    if (typeof body.subject !== 'string' || !body.subject.trim()) return { code: 400, body: { error: 'subject is required (what this run is for)' } };
    store.putControl('pipeline-' + body.pipeline + '-' + body.run, { pipeline: body.pipeline, run: body.run, subject: body.subject.slice(0, 2000), owner_advanced: [] });
    return advancePipeline(body.pipeline, body.run, {});
  }
  async function advancePipeline(pipelineId, run, { owner = false, dryRun = false } = {}) {
    const def = pipelineDefs[pipelineId];
    const rec = store.getControl('pipeline-' + pipelineId + '-' + run);
    if (!def || !rec) return { code: 404, body: { error: 'UNKNOWN_RUN' } };
    const missions = await heisenberg.listMissions();
    const advanced = new Set(rec.owner_advanced || []);
    let step = nextStep(pipelineId, def, run, missions, advanced);
    if (owner && step.action === 'owner_gate') {
      advanced.add(step.index);
      store.putControl('pipeline-' + pipelineId + '-' + run, Object.assign({}, rec, { owner_advanced: [...advanced] }));
      step = nextStep(pipelineId, def, run, missions, advanced);
    }
    if (dryRun || step.action !== 'submit') return { code: 200, body: { pipeline: pipelineId, run, step } };
    const st = step.stage;
    const r = await heisenberg.submitMission({ mission_id: step.mission_id, user_intent: st.name + ' for ' + rec.subject + '. Done means: ' + st.done_means + '.',
      district: st.district, builder: st.builder, judge: st.judge, permissions: st.permissions, pipeline: st.pipeline || null,
      pipeline_run: pipelineId + '/' + run, stage_name: st.name, acceptance_criteria: [st.done_means], budget_usd: Number(env.PIPELINE_STAGE_BUDGET_USD) || 1 });
    log('pipeline_stage', { pipeline: pipelineId, run, stage: st.name, code: r.code });
    return { code: r.code >= 400 ? r.code : 202, body: { pipeline: pipelineId, run, step: { action: 'submitted', index: step.index, mission_id: step.mission_id }, result: r.body } };
  }
  async function advanceAllPipelines() {
    const out = [];
    for (const [id] of Object.entries(pipelineDefs)) {
      // runs are recorded by startPipeline; advance each that is not finished
      for (const k of (store.listControl ? store.listControl('pipeline-' + id + '-') : [])) {
        const r = await advancePipeline(id, k.run, {}).catch(e => ({ code: 500, body: { error: e.message } }));
        out.push({ pipeline: id, run: k.run, step: r.body && r.body.step });
      }
    }
    return out;
  }

  // District board from Paperclip: the mission id prefix names the district; otherwise the spec does.
  async function boardNow() {
    const city = overrides.city || loadCity();
    const ids = new Set(city.map(d => d.id));
    const missions = await heisenberg.listMissions();
    const withSpec = [];
    for (const m of missions) {
      if (!['todo', 'in_progress', 'blocked', 'in_review'].includes(m.status)) continue;
      const prefix = String(m.mission_id).split('.')[0];
      let district = ids.has(prefix) ? prefix : null;
      if (!district) { const full = await client.getIssue(m.issueId).catch(() => null); const sp = full && /```starfactory-spec\n([\s\S]*?)\n```/.exec(String(full.description || '')); try { district = sp ? JSON.parse(sp[1]).district : null; } catch { district = null; } }
      withSpec.push({ id: m.issueId, title: '[sf:' + m.mission_id + ']', status: m.status, spec: { district } });
    }
    return districtBoard(city, withSpec);
  }

  async function start({ reconcileMs = Number(env.FACTORY_RECONCILE_MS) || 60000, pollMs = Number(env.FACTORY_POLL_MS) || 3000 } = {}) {
    const recovered = await bridge.recover().catch(e => { log('recover_failed', { error: e.message }); return []; });
    timers.push(setInterval(() => heisenberg.reconcileAll().catch(e => log('reconcile_failed', { error: e.message })), reconcileMs));
    timers.push(setInterval(() => foremanSweep().catch(e => log('sweep_failed', { error: e.message })), Number(env.FOREMAN_SWEEP_MS) || 5 * 60 * 1000));
    timers.push(setInterval(() => projection.poll().catch(e => log('poll_failed', { error: e.message })), pollMs));
    timers.forEach(t => t.unref && t.unref());
    return { recovered };
  }
  function stop() { timers.forEach(clearInterval); timers = []; }

  return { handle, start, stop, heisenberg, bridge, projection, store, client, roles, chiefNow, foremanSweep, runStanding, boardNow, startPipeline, advancePipeline, advanceAllPipelines };
}

module.exports = { makeFactory, tokenOk };
