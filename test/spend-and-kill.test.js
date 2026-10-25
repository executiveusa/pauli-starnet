/* spend-and-kill.test.js - money brakes and model policy (program/starnet-v2/03_spend-and-kill).
   Unit: spend totals, the $2/day alert (once), mission over-budget alert, the $20/month hard stop, the kill switch (anyone
   engages, only the captain releases), newest-DeepSeek resolution from a captured OpenRouter listing, Opus refused unless
   a captain grant is live, and the mission desk refusing to dispatch behind a brake while passing the $0.25 budget.
   End to end: the real gateway engages "stop everything", refuses a mission, and serves /v1/spend + /v1/models/default.
   Run: node test/spend-and-kill.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { makeSpend } = require('../gateway/spend.js');
const { pickNewestDeepSeek, makeModelPolicy } = require('../gateway/models.js');
const { makeMissionDesk } = require('../gateway/missions.js');

const ROOT = path.join(__dirname, '..');
function req(method, port, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}) }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
  });
}
const mission = (id, intent) => ({ mission_id: id, request_id: id, trace_id: 't-' + id, target: 'starnet', route: 'city', user_intent: intent || '[district:production] #1 build it', permissions: ['research'] });

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-'));
  let clock = Date.parse('2026-10-25T10:00:00Z');
  const s = makeSpend({ file: path.join(tmp, 'spend.jsonl'), killFile: path.join(tmp, 'kill.json'), now: () => clock });

  // ---- totals + alerts ----
  A.eq(s.summary().has_data, false, 'no rows = no spend data, not $0 claimed as measured');
  A.eq(s.check(), { ok: true, budget_usd: 0.25 }, 'an open gate hands out the $0.25 mission budget');
  A.eq(s.record({ mission_id: 'm1', district: 'production', usd: 0.1 }).alerts, [], 'small spend raises nothing');
  const over = s.record({ mission_id: 'm2', district: 'creative', usd: 0.3 }).alerts;
  A.eq(over.map(a => a.kind), ['MISSION_OVER_BUDGET'], 'a mission past $0.25 raises an over-budget alert');
  const dayHit = s.record({ mission_id: 'm3', district: 'production', usd: 1.65 }).alerts;
  A.ok(dayHit.some(a => a.kind === 'DAY_ALERT'), 'crossing $2 in a day raises the day alert');
  A.ok(!s.record({ mission_id: 'm4', district: 'production', usd: 0.05 }).alerts.some(a => a.kind === 'DAY_ALERT'), 'the day alert fires once, not on every later mission');
  const t = s.totals();
  A.eq([t.day_usd, t.by_district.production], [2.1, 1.8], 'day total and per-district totals add up');
  A.eq(s.record({ mission_id: 'm5', district: 'x', usd: -1 }).recorded, false, 'negative spend refused');
  A.ok(s.summary().alerts.length >= 2, 'alerts persist for the daily report');

  // ---- month hard stop ----
  clock = Date.parse('2026-10-26T10:00:00Z');
  s.record({ mission_id: 'm6', district: 'production', usd: 17.9 });
  const stop = s.check();
  A.eq([stop.ok, stop.reason], [false, 'MONTH_CAP_REACHED'], '$20 in the month is a hard stop');
  clock = Date.parse('2026-11-01T00:00:01Z');
  A.eq(s.check().ok, true, 'a new month reopens the gate');

  // ---- kill switch ----
  A.eq(s.kill({ by: 'stranger' }).code, 400, 'kill needs a known source');
  A.eq(s.kill({ by: 'instinct', reason: 'stop everything' }).code, 200, 'Instinct engages the kill switch');
  A.eq(s.check().reason, 'KILL_SWITCH_ENGAGED', 'nothing dispatches while killed');
  A.eq(s.release({ by: 'instinct', confirm: 'release' }).code, 403, 'Instinct cannot release it');
  A.eq(s.release({ by: 'captain' }).code, 403, 'release needs the explicit confirm word');
  A.eq(s.release({ by: 'captain', confirm: 'release' }).code, 200, 'the captain releases it');
  A.eq(s.check().ok, true, 'gate open again after release');

  // ---- model policy ----
  const listing = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'openrouter-deepseek-2026-10-25.json'), 'utf8'));
  const pick = pickNewestDeepSeek(listing);
  A.eq(pick.model, 'deepseek/deepseek-v4.1-flash-1017', 'newest DeepSeek by created date, aliases and variants excluded');
  A.eq([pick.usd_per_mtok_in, pick.usd_per_mtok_out], [0.15, 0.6], 'price per million tokens read from the listing');
  A.eq(pickNewestDeepSeek({ data: [{ id: 'other/x', created: 9 }] }), null, 'no DeepSeek = no pick (default left unchanged)');
  let mclock = Date.parse('2026-10-25T10:00:00Z');
  const mp = makeModelPolicy({ defaultFile: path.join(tmp, 'def.json'), opusFile: path.join(tmp, 'opus.json'), now: () => mclock });
  A.eq(mp.allowed('deepseek/deepseek-v4.1-flash-1017').ok, true, 'DeepSeek allowed');
  A.eq(mp.allowed('anthropic/claude-opus-5.5').reason, 'OPUS_NEEDS_CAPTAIN', 'Opus refused without the captain');
  A.eq(mp.grantOpus({ by: 'instinct', confirm: 'opus', minutes: 30 }).code, 403, 'only the captain grants Opus');
  A.eq(mp.grantOpus({ by: 'captain', confirm: 'opus', minutes: 999 }).code, 400, 'grant window is bounded');
  A.eq(mp.grantOpus({ by: 'captain', confirm: 'opus', minutes: 30, reason: 'motion pass' }).code, 200, 'captain grants a 30-minute window');
  A.eq(mp.allowed('anthropic/claude-opus-5.5').ok, true, 'Opus allowed inside the window');
  mclock += 31 * 60000;
  A.eq(mp.allowed('anthropic/claude-opus-5.5').ok, false, 'Opus refused again when the window ends');

  // ---- the mission desk behind the brakes ----
  const s2 = makeSpend({ file: path.join(tmp, 's2.jsonl'), killFile: path.join(tmp, 'k2.json') });
  let seen = null, runs = 0;
  const desk = makeMissionDesk({ stateDir: path.join(tmp, 'desk'), spend: s2, runForeman: async b => { runs++; seen = b; return { status: 'done', summary: 'ok', usd: 0.12, model: 'deepseek/x' }; } });
  const ok = desk.accept(mission('mm-1'));
  A.eq(ok.code, 202, 'an open gate dispatches');
  await ok.done;
  A.eq(seen.budget_usd, 0.25, 'the run carries the $0.25 budget');
  A.eq(s2.totals().by_district.production, 0.12, 'the settled cost is recorded against its district');
  s2.kill({ by: 'command-center', reason: 'test' });
  const refused = desk.accept(mission('mm-2'));
  A.eq([refused.code, refused.body.error, runs], [423, 'KILL_SWITCH_ENGAGED', 1], 'killed: refused before any run starts');
  s2.release({ by: 'captain', confirm: 'release' });
  const retried = desk.accept(mission('mm-2'));
  A.eq(retried.code, 202, 'the same mission can be sent again after release');
  await retried.done;

  // ---- end to end: the real gateway ----
  const GW = 49996 + Math.floor(Math.random() * 3), TOKEN = 'tok-' + Math.random().toString(36).slice(2);
  const env = Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(GW), STARNET_PORT: '1', STARNET_MISSION_DIR: path.join(tmp, 'gm'), STARNET_DISTRICT_STATE: path.join(tmp, 'd.json'), STARNET_SPEND_FILE: path.join(tmp, 'gs.jsonl'), STARNET_KILL_FILE: path.join(tmp, 'gk.json'), STARNET_MODEL_DEFAULT_FILE: path.join(tmp, 'gdef.json'), STARNET_OPUS_FILE: path.join(tmp, 'gopus.json'), KB_SUPABASE_URL: '', KB_SUPABASE_SERVICE_KEY: '', LOG_LEVEL: 'error' });
  const child = spawn(process.execPath, [path.join(ROOT, 'gateway', 'server.js')], { env, stdio: 'ignore' });
  try {
    const auth = { Authorization: 'Bearer ' + TOKEN };
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { try { await req('GET', GW, '/health', auth); up = true; } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
    A.ok(up, 'gateway started');
    A.eq((await req('POST', GW, '/v1/kill', {}, { by: 'instinct' })).status, 401, 'kill sits behind the bearer');
    A.eq((await req('POST', GW, '/v1/kill', auth, { by: 'instinct', reason: 'stop everything' })).status, 200, '"stop everything" over HTTP');
    const m = await req('POST', GW, '/v1/missions', auth, mission('gw-1'));
    A.eq([m.status, JSON.parse(m.body).error], [423, 'KILL_SWITCH_ENGAGED'], 'the gateway refuses missions while killed');
    const sp = JSON.parse((await req('GET', GW, '/v1/spend', auth)).body);
    A.eq([sp.kill.engaged, sp.caps.month_usd, sp.caps.mission_usd], [true, 20, 0.25], '/v1/spend shows the brake and the caps');
    A.eq((await req('POST', GW, '/v1/kill/release', auth, { by: 'captain', confirm: 'release' })).status, 200, 'captain release over HTTP');
    A.eq((await req('GET', GW, '/v1/models/allowed?model=anthropic/claude-opus-5.5', auth)).status, 403, 'Opus refused over HTTP');
    const md = JSON.parse((await req('GET', GW, '/v1/models/default', auth)).body);
    A.ok(/not resolved yet/.test(md.default_source), 'an unresolved default says so instead of inventing one');
  } finally { child.kill(); }
  A.report();
})().catch(e => { console.log('FAIL: ' + (e && e.stack || e)); process.exit(1); });
