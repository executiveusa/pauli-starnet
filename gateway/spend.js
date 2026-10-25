/* spend.js - the city's money brakes (program/starnet-v2/03_spend-and-kill).
   One gate in front of every dispatch (POST /v1/missions, which the foreman, Instinct and the command center all use):
   - kill switch engaged ("Instinct, stop everything") -> nothing dispatches until the captain releases it
   - month spend >= MONTH_CAP_USD -> nothing dispatches (hard stop)
   - every run carries a per-mission budget (MISSION_CAP_USD) for the sidecar's own limits to enforce mid-run
   - day spend >= DAY_ALERT_USD -> one alert per UTC day, raised to Instinct's report
   Spend comes from each settled mission's reported usd (append-only JSONL). Nothing is estimated: no row = no spend data. */
'use strict';

const fs = require('fs');
const path = require('path');

const CAPS = { month_usd: 20, day_alert_usd: 2, mission_usd: 0.25 };
const BY = ['instinct', 'command-center', 'captain'];

function makeSpend({ file, killFile, now = () => Date.now(), caps = {} }) {
  const c = { ...CAPS, ...caps };
  const day = t => new Date(t).toISOString().slice(0, 10);
  const month = t => new Date(t).toISOString().slice(0, 7);

  function rows() {
    let txt = '';
    try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { return []; }
    const out = [];
    for (const line of txt.split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); if (r && r.mission_id && typeof r.usd === 'number') out.push(r); } catch (_) { /* torn line */ }
    }
    return out;
  }
  function killState() {
    try { const k = JSON.parse(fs.readFileSync(killFile, 'utf8')); return k && k.engaged ? k : { engaged: false }; } catch (_) { return { engaged: false }; }
  }
  function totals(t = now()) {
    const all = rows();
    const m = all.filter(r => r.ts.slice(0, 7) === month(t));
    const d = m.filter(r => r.ts.slice(0, 10) === day(t));
    const sum = list => Math.round(list.reduce((a, r) => a + r.usd, 0) * 1e6) / 1e6;
    const byDistrict = {};
    for (const r of m) byDistrict[r.district] = Math.round(((byDistrict[r.district] || 0) + r.usd) * 1e6) / 1e6;
    return { month: month(t), day: day(t), month_usd: sum(m), day_usd: sum(d), missions_this_month: m.length, by_district: byDistrict, has_data: all.length > 0 };
  }

  // Before a dispatch: may this mission start? Returns { ok, code, reason, budget_usd }.
  function check() {
    const k = killState();
    if (k.engaged) return { ok: false, code: 423, reason: 'KILL_SWITCH_ENGAGED', detail: 'engaged by ' + k.by + ' at ' + k.at + (k.reason ? ': ' + k.reason : '') };
    const t = totals();
    if (t.month_usd >= c.month_usd) return { ok: false, code: 423, reason: 'MONTH_CAP_REACHED', detail: '$' + t.month_usd.toFixed(4) + ' of $' + c.month_usd + ' spent in ' + t.month };
    return { ok: true, budget_usd: c.mission_usd };
  }

  // After a mission settles: record what it actually cost. Returns any alerts raised.
  function record({ mission_id, district, usd, model }) {
    const n = Number(usd);
    if (!mission_id || !Number.isFinite(n) || n < 0) return { recorded: false, alerts: [] };
    const before = totals();
    const row = { ts: new Date(now()).toISOString(), mission_id: String(mission_id).slice(0, 120), district: String(district || 'unknown').slice(0, 40), usd: Math.round(n * 1e6) / 1e6 };
    if (model) row.model = String(model).slice(0, 120);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(row) + '\n', { mode: 0o600 });
    const after = totals();
    const alerts = [];
    if (row.usd > c.mission_usd) alerts.push({ kind: 'MISSION_OVER_BUDGET', mission_id: row.mission_id, usd: row.usd, cap: c.mission_usd });
    if (before.day_usd < c.day_alert_usd && after.day_usd >= c.day_alert_usd) alerts.push({ kind: 'DAY_ALERT', day: after.day, usd: after.day_usd, threshold: c.day_alert_usd });
    if (before.month_usd < c.month_usd && after.month_usd >= c.month_usd) alerts.push({ kind: 'MONTH_CAP_REACHED', month: after.month, usd: after.month_usd, cap: c.month_usd });
    for (const a of alerts) fs.appendFileSync(file + '.alerts', JSON.stringify({ ts: row.ts, ...a }) + '\n', { mode: 0o600 });
    return { recorded: true, row, alerts };
  }

  function writeKill(state) {
    fs.mkdirSync(path.dirname(killFile), { recursive: true });
    const tmp = killFile + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(tmp, killFile);
  }
  // "Instinct, stop everything": anyone with the gateway bearer can engage. Release is the captain's (recorded as such).
  function kill({ by, reason }) {
    if (!BY.includes(by)) return { code: 400, body: { error: 'by must be ' + BY.join(', ') } };
    const state = { engaged: true, by, reason: String(reason || '').slice(0, 300), at: new Date(now()).toISOString() };
    writeKill(state);
    return { code: 200, body: { kill: state } };
  }
  function release({ by, confirm }) {
    if (by !== 'captain' || confirm !== 'release') return { code: 403, body: { error: 'only the captain releases the kill switch (by: "captain", confirm: "release")' } };
    const prior = killState();
    writeKill({ engaged: false, released_by: 'captain', at: new Date(now()).toISOString(), prior });
    return { code: 200, body: { kill: { engaged: false } } };
  }

  function alerts(t = now()) {
    let txt = '';
    try { txt = fs.readFileSync(file + '.alerts', 'utf8'); } catch (_) { return []; }
    const m = month(t);
    return txt.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(a => a && String(a.ts).slice(0, 7) === m);
  }
  function summary() { return { caps: c, kill: killState(), ...totals(), alerts: alerts() }; }

  return { check, record, kill, release, summary, totals, alerts, CAPS: c };
}

module.exports = { makeSpend, CAPS };
