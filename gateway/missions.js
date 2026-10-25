'use strict';
// The gateway's mission desk (program/starnet-v1/04_foreman). Terabithia posts a MissionEnvelope; the desk decides
// the tier, persists one file per mission, runs GREEN work through the sidecar foreman route in the background, and
// answers with Terabithia's ResultEnvelope shape. A restart never leaves a mission "working" forever.
const fs = require('fs');
const path = require('path');

const MISSION_ID_RE = /^[A-Za-z0-9_.:-]{1,100}$/;
// Night-1 GREEN = read-only research. Anything else is parked for the captain, never run.
const GREEN_PERMISSIONS = new Set(['research', 'web.read', 'read']);

function isValidPermissionsArray(arr) { return Array.isArray(arr) && arr.every((p) => typeof p === 'string'); }

function tierOf(envelope) {
  // Fail closed: an envelope that declares NO permissions is not research - it is undeclared,
  // and undeclared work parks for the captain. GREEN requires at least one explicit read-scoped
  // permission and nothing outside the read set. (Audit finding 2026-09-27: [].every() made the
  // default GREEN, so a publish intent with no permissions ran instead of parking.)
  const perms = isValidPermissionsArray(envelope.permissions) ? envelope.permissions : []; // non-string entries are undeclared: fail closed, never String-coerce (codex P1)
  if (perms.length === 0) return 'YELLOW';
  return perms.every(p => GREEN_PERMISSIONS.has(p)) ? 'GREEN' : 'YELLOW';
}

function validate(envelope) {
  if (!envelope || typeof envelope !== 'object') return 'body must be a MissionEnvelope';
  if (!MISSION_ID_RE.test(String(envelope.mission_id || ''))) return 'mission_id is required';
  if (typeof envelope.user_intent !== 'string' || !envelope.user_intent.trim() || envelope.user_intent.length > 8000) return 'user_intent is required (<= 8000 chars)';
  if (envelope.target !== 'starnet') return 'target must be starnet';
  if (envelope.route !== 'city') return 'route must be city';
  if (envelope.permissions !== undefined && !isValidPermissionsArray(envelope.permissions)) return 'permissions must be an array of strings';
  return null;
}

function makeMissionDesk({ stateDir, runForeman, now = () => new Date().toISOString(), revision = 'unknown', spend = null }) {
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  // ':' is the only allowed id character that is unsafe in a filename; '~' is never in an id, so the map is one-to-one.
  const fileOf = id => path.join(stateDir, id.replace(/:/g, '~') + '.json');
  const load = id => {
    let rec; try { rec = JSON.parse(fs.readFileSync(fileOf(id), 'utf8')); } catch { return null; }
    return rec && rec.mission_id === id ? rec : null;
  };
  const save = rec => {
    const file = fileOf(rec.mission_id);
    const tmp = file + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(rec, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, file);
    return rec;
  };

  function envelopeFor(envelope, fields) {
    const crew = fields.crew || [];
    const crewRefs = crew.map(c => ({ type: 'trace', ref: 'starnet://run/' + c.run_id, summary: c.agent_id + ' ' + c.status }));
    const revisionRef = { type: 'external_state', ref: 'git:' + revision, summary: 'StarNet gateway revision' };
    const evidence = crewRefs.slice();
    if (fields.run_id) evidence.unshift({ type: 'trace', ref: 'starnet://run/' + fields.run_id, summary: 'foreman run' });
    evidence.push(revisionRef);
    // contracts.md §3: one artifact per crew run plus the deployed commit, and only once the mission has finished.
    const artifacts = ['done', 'failed'].includes(fields.status) ? crewRefs.concat([revisionRef]) : [];
    return {
      mission_id: envelope.mission_id,
      request_id: envelope.request_id || null,
      trace_id: envelope.trace_id || null,
      agent_id: 'starnet',
      status: fields.status,
      summary: fields.summary || '',
      artifacts,
      evidence,
      failures: fields.failures || [],
      human_blocker: fields.human_blocker || null,
      handoff: null,
      memory_candidate: null,
      next_action: fields.next_action || null,
      completed_at: ['done', 'failed', 'needs_human'].includes(fields.status) ? now() : null,
      crew,
      solo: fields.solo === undefined ? null : fields.solo,
      runtime: { starnet_mission_id: envelope.mission_id, run_id: fields.run_id || null, revision, usd: Number(fields.usd) || 0 }
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
      save({ mission_id: envelope.mission_id, envelope, result, district: (/^\[district:([a-z0-9-]+)\]/.exec(envelope.user_intent) || [])[1] || 'direct', accepted_at: now() });
      return { code: 200, body: result };
    }
    // Money brakes (program/starnet-v2/03): the kill switch and the month cap stop a dispatch before it starts; nothing is
    // saved, so the same mission can be sent again once the captain releases the brake.
    const gate = spend ? spend.check() : { ok: true, budget_usd: null };
    if (!gate.ok) return { code: gate.code, body: { error: gate.reason, detail: gate.detail, mission_id: envelope.mission_id } };
    const district = (/^\[district:([a-z0-9-]+)\]/.exec(envelope.user_intent) || [])[1] || 'direct';
    const result = envelopeFor(envelope, { status: 'working', summary: 'Heisenberg has the mission.' });
    const accepted_at = now();
    save({ mission_id: envelope.mission_id, envelope, result, district, accepted_at });
    const done = Promise.resolve()
      .then(() => runForeman({ mission_id: envelope.mission_id, intent: envelope.user_intent, tier: 'GREEN', budget_usd: gate.budget_usd }))
      .then(out => { if (spend && out && typeof out.usd === 'number') spend.record({ mission_id: envelope.mission_id, district, usd: out.usd, model: out.model }); return out; })
      .then(out => envelopeFor(envelope, {
        status: out && out.status === 'done' ? 'done' : 'failed',
        summary: out && out.status === 'done' ? out.summary : '',
        failures: out && out.status === 'done' ? [] : [String((out && out.reason) || 'foreman returned no result')],
        crew: (out && out.crew) || [], solo: out ? out.solo : null, run_id: out && out.run_id, usd: out && out.usd
      }))
      .catch(e => envelopeFor(envelope, { status: 'failed', failures: ['foreman run failed: ' + (e && e.message ? e.message : String(e))] }))
      .then(final => save({ mission_id: envelope.mission_id, envelope, result: final, district, accepted_at }).result);
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

  // Every mission the desk holds, newest first: what the city view walks agents on and the board counts.
  // A row is the desk's own record (district from the "[district:x]" prefix, the accepted time, the result status).
  function list() {
    const out = [];
    let files = [];
    try { files = fs.readdirSync(stateDir); } catch { return out; }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      let rec; try { rec = JSON.parse(fs.readFileSync(path.join(stateDir, f), 'utf8')); } catch { continue; }
      if (!rec || !rec.result || !MISSION_ID_RE.test(String(rec.mission_id || ''))) continue;
      out.push({
        mission_id: rec.mission_id,
        district: rec.district || (/^\[district:([a-z0-9-]+)\]/.exec((rec.envelope && rec.envelope.user_intent) || '') || [])[1] || 'direct',
        status: rec.result.status,
        accepted_at: rec.accepted_at || null,
        completed_at: rec.result.completed_at || null,
        crew: (rec.result.crew || []).map(c => c && c.agent_id).filter(Boolean),
        usd: rec.result.runtime ? Number(rec.result.runtime.usd) || 0 : 0
      });
    }
    out.sort((a, b) => String(b.accepted_at || b.completed_at || '').localeCompare(String(a.accepted_at || a.completed_at || '')));
    return out;
  }

  return { accept, get, list, recoverOnBoot };
}

module.exports = { makeMissionDesk, tierOf, validate, GREEN_PERMISSIONS };
