'use strict';
// The gateway's mission desk (program/starnet-v1/04_foreman). Terabithia posts a MissionEnvelope; the desk decides
// the tier, persists one file per mission, runs GREEN work through the sidecar foreman route in the background, and
// answers with Terabithia's ResultEnvelope shape. A restart never leaves a mission "working" forever.
const fs = require('fs');
const path = require('path');

const MISSION_ID_RE = /^[A-Za-z0-9_.:-]{1,100}$/;
// Night-1 GREEN = read-only research. Anything else is parked for the captain, never run.
const GREEN_PERMISSIONS = new Set(['research', 'web.read', 'read']);

function tierOf(envelope) {
  // Fail closed: an envelope that declares NO permissions is not research - it is undeclared,
  // and undeclared work parks for the captain. GREEN requires at least one explicit read-scoped
  // permission and nothing outside the read set. (Audit finding 2026-09-27: [].every() made the
  // default GREEN, so a publish intent with no permissions ran instead of parking.)
  const perms = Array.isArray(envelope.permissions) ? envelope.permissions.map(String) : [];
  if (perms.length === 0) return 'YELLOW';
  return perms.every(p => GREEN_PERMISSIONS.has(p)) ? 'GREEN' : 'YELLOW';
}

function validate(envelope) {
  if (!envelope || typeof envelope !== 'object') return 'body must be a MissionEnvelope';
  if (!MISSION_ID_RE.test(String(envelope.mission_id || ''))) return 'mission_id is required';
  if (typeof envelope.user_intent !== 'string' || !envelope.user_intent.trim() || envelope.user_intent.length > 8000) return 'user_intent is required (<= 8000 chars)';
  if (envelope.target !== 'starnet') return 'target must be starnet';
  if (envelope.route !== 'city') return 'route must be city';
  if (envelope.permissions !== undefined && !Array.isArray(envelope.permissions)) return 'permissions must be an array of strings';
  return null;
}

function makeMissionDesk({ stateDir, runForeman, now = () => new Date().toISOString(), revision = 'unknown' }) {
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const fileOf = id => path.join(stateDir, id.replace(/[^A-Za-z0-9_.-]/g, '_') + '.json');
  const load = id => { try { return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')); } catch { return null; } };
  const save = rec => {
    const file = fileOf(rec.mission_id);
    const tmp = file + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(rec, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, file);
    return rec;
  };

  function envelopeFor(envelope, fields) {
    const crew = fields.crew || [];
    const evidence = crew.map(c => ({ type: 'trace', ref: 'starnet://run/' + c.run_id, summary: c.agent_id + ' ' + c.status }));
    if (fields.run_id) evidence.unshift({ type: 'trace', ref: 'starnet://run/' + fields.run_id, summary: 'foreman run' });
    evidence.push({ type: 'external_state', ref: 'git:' + revision, summary: 'StarNet gateway revision' });
    return {
      mission_id: envelope.mission_id,
      request_id: envelope.request_id || null,
      trace_id: envelope.trace_id || null,
      agent_id: 'starnet',
      status: fields.status,
      summary: fields.summary || '',
      artifacts: [],
      evidence,
      failures: fields.failures || [],
      human_blocker: fields.human_blocker || null,
      handoff: null,
      memory_candidate: null,
      next_action: fields.next_action || null,
      completed_at: ['done', 'failed', 'needs_human'].includes(fields.status) ? now() : null,
      crew,
      solo: fields.solo === undefined ? null : fields.solo,
      runtime: { starnet_mission_id: envelope.mission_id, run_id: fields.run_id || null, revision }
    };
  }

  function accept(envelope) {
    const bad = validate(envelope);
    if (bad) return { code: 400, body: { error: bad } };
    const existing = load(envelope.mission_id);
    if (existing) return { code: 200, body: existing.result };   // idempotent: a retried mission never runs twice
    if (tierOf(envelope) !== 'GREEN') {
      const result = envelopeFor(envelope, {
        status: 'needs_human',
        summary: 'This mission asks for more than read-only research, so it waits for the captain.',
        human_blocker: { type: 'sensitive_approval', title: 'Captain approval needed', why: 'permissions beyond read-only research: ' + (envelope.permissions || []).join(', '), action: 'Approve or deny in the Command Center', resume_token: envelope.mission_id }
      });
      save({ mission_id: envelope.mission_id, envelope, result });
      return { code: 200, body: result };
    }
    const result = envelopeFor(envelope, { status: 'working', summary: 'Heisenberg has the mission.' });
    save({ mission_id: envelope.mission_id, envelope, result });
    const done = Promise.resolve()
      .then(() => runForeman({ mission_id: envelope.mission_id, intent: envelope.user_intent, tier: 'GREEN' }))
      .then(out => envelopeFor(envelope, {
        status: out && out.status === 'done' ? 'done' : 'failed',
        summary: out && out.status === 'done' ? out.summary : '',
        failures: out && out.status === 'done' ? [] : [String((out && out.reason) || 'foreman returned no result')],
        crew: (out && out.crew) || [], solo: out ? out.solo : null, run_id: out && out.run_id
      }))
      .catch(e => envelopeFor(envelope, { status: 'failed', failures: ['foreman run failed: ' + (e && e.message ? e.message : String(e))] }))
      .then(final => save({ mission_id: envelope.mission_id, envelope, result: final }).result);
    return { code: 202, body: result, done };
  }

  function get(id) {
    if (!MISSION_ID_RE.test(String(id || ''))) return null;
    const rec = load(id);
    return rec ? rec.result : null;
  }

  // A gateway restart kills the background run; say so instead of leaving it "working" forever.
  function recoverOnBoot() {
    let n = 0;
    for (const f of fs.readdirSync(stateDir)) {
      if (!f.endsWith('.json')) continue;
      let rec; try { rec = JSON.parse(fs.readFileSync(path.join(stateDir, f), 'utf8')); } catch { continue; }
      if (rec && rec.result && rec.result.status === 'working') {
        rec.result = envelopeFor(rec.envelope, { status: 'failed', failures: ['interrupted: the StarNet gateway restarted'] });
        save(rec); n++;
      }
    }
    return n;
  }

  return { accept, get, recoverOnBoot };
}

module.exports = { makeMissionDesk, tierOf, validate, GREEN_PERMISSIONS };
