/* city-live-board.test.js - the city moves on real missions, and the board reads the gateway's own ledgers
   (program/starnet-v2/08_city-live).
   Unit: missionTasks binds a routed mission to the roster agent of its district (else Heisenberg) and never carries the
   intent text; revenue is captain-only; an intake is "done" only with the judge AND security receipts; the board reports
   has_data:false for an empty ledger and adds up what the ledgers hold.
   End to end: the real gateway + a stub sidecar whose foreman run is held open. A mission routed to the creative
   district shows as a RUNNING task bound to the creative agent in /v1/city/status, survives the public Netlify DTO as
   that agent's public name, and lands in CityCore.worldWorkSet (the set the 2D world walks to work); when the run
   settles the body is released (an idle agent stops working), and /v1/board counts the outcome and its spend.
   Run: node test/city-live-board.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const { makeBoard, makeRevenue, missionTasks } = require('../gateway/board.js');
const { makeIntake } = require('../gateway/intake.js');
const { makeSpend } = require('../gateway/spend.js');
const CityCore = require('../frontend/city/city-core.js');

const ROOT = path.join(__dirname, '..');
function req(method, port, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}) }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const ROSTER = [
  { id: 'agent', name: 'Heisenberg', role: 'orchestrator', district: 'command' },
  { id: 'quill', name: 'Quill', role: 'writer', district: 'creative' }
];

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'city-live-'));

  // ---- missionTasks: who walks for a routed mission ----
  const rows = missionTasks([
    { mission_id: 'm1', district: 'creative', status: 'working', accepted_at: '2026-10-25T10:00:00Z' },
    { mission_id: 'm2', district: 'financial', status: 'done', accepted_at: '2026-10-25T09:00:00Z', completed_at: '2026-10-25T09:05:00Z' },
    { mission_id: 'm3', district: 'security', status: 'needs_human' }
  ], ROSTER);
  A.eq([rows[0].status, rows[0].context.agentId, rows[0].context.district], ['running', 'quill', 'creative'], 'a mission routed to creative binds the creative agent and runs');
  A.eq([rows[1].status, rows[1].context.agentId], ['completed', 'agent'], 'no roster agent in the district: Heisenberg holds the mission');
  A.eq(rows[2].status, 'accepted', 'a parked mission reads accepted, never running');
  A.ok(rows.every(r => r.task === '' && r.id.startsWith('mission:')), 'the intent text never leaves the gateway');
  A.eq(missionTasks([{ mission_id: 'x', district: 'creative', status: 'working' }], []).map(r => r.context.agentId), [null], 'no roster at all: nobody is claimed');

  // ---- revenue: captain-only, real refs ----
  const rev = makeRevenue({ file: path.join(tmp, 'rev.jsonl'), now: () => Date.parse('2026-10-25T12:00:00Z') });
  A.eq(rev.record({ by: 'instinct', usd: 50, offer: 'kindle', ref: 'FO1' }).code, 403, 'Instinct cannot record money');
  A.eq(rev.record({ by: 'captain', usd: -5, offer: 'kindle', ref: 'FO1' }).code, 400, 'no negative revenue');
  A.eq(rev.record({ by: 'captain', usd: 50, offer: 'lottery', ref: 'FO1' }).code, 400, 'offer must be a known money loop');
  A.eq(rev.record({ by: 'captain', usd: 50, offer: 'kindle', ref: 'Jane Doe <jane@x.com>' }).code, 400, 'ref is an order id, never a buyer name or contact');
  A.eq(rev.record({ by: 'captain', usd: 49.999, offer: 'kindle', ref: 'FO-1001' }).code, 201, 'the captain records a Fiverr payout');

  // ---- intake settle: done needs both receipts ----
  const intake = makeIntake(path.join(tmp, 'intake.jsonl'), { now: () => Date.parse('2026-10-25T12:00:00Z') });
  const sub = intake.submit({ repo: 'executiveusa/demo-site', instructions: 'build it', submitted_by: 'instinct' });
  A.eq(sub.code, 201, 'an intake is queued');
  const id = sub.body.intake.id;
  A.eq(intake.settle({ intake_id: 'nope', status: 'done' }).code, 404, 'unknown intake refused');
  A.eq(intake.settle({ intake_id: id, status: 'done', evidence: { judge_receipt: 'evidence/abc1234/06-judge.json' } }).code, 400, 'done without the security receipt is refused');
  A.eq(intake.settle({ intake_id: id, status: 'done', evidence: { judge_receipt: '../../etc/passwd', security_receipt: 'evidence/abc1234/07-security-run-1.json' } }).code, 400, 'a receipt path outside evidence/<sha>/ is refused');
  A.eq(intake.settle({ intake_id: id, status: 'building' }).code, 200, 'the factory marks it building');
  A.eq(intake.read()[0].status, 'building', 'the latest verdict is the intake status');
  A.eq(intake.settle({ intake_id: id, status: 'done', evidence: { judge_receipt: 'evidence/abc1234/06-judge.json', security_receipt: 'evidence/abc1234/07-security-run-2.json' } }).code, 200, 'done with both receipts');
  A.eq(intake.list('2026-10-25').intakes.length, 1, 'settle rows are not counted as new intakes (the 5/day cap is unchanged)');

  // ---- board: empty vs filled ----
  const emptyBoard = makeBoard({ revenue: makeRevenue({ file: path.join(tmp, 'none.jsonl') }), missions: { list: () => [] }, intake: makeIntake(path.join(tmp, 'none-i.jsonl')), spend: makeSpend({ file: path.join(tmp, 'none-s.jsonl'), killFile: path.join(tmp, 'none-k.json') }) }).summary();
  A.eq([emptyBoard.dollars.has_data, emptyBoard.outcomes.has_data, emptyBoard.factory.has_data, emptyBoard.spend.has_data], [false, false, false, false], 'empty ledgers say has_data:false, not a measured zero');
  const b = makeBoard({ revenue: rev, intake, now: () => Date.parse('2026-10-25T12:00:00Z'), missions: { list: () => [
    { mission_id: 'a', district: 'creative', status: 'done', completed_at: '2026-10-25T10:00:00Z' },
    { mission_id: 'b', district: 'creative', status: 'failed', completed_at: '2026-10-25T10:00:00Z' },
    { mission_id: 'c', district: 'production', status: 'working', accepted_at: '2026-10-25T11:00:00Z' },
    { mission_id: 'd', district: 'production', status: 'done', completed_at: '2026-09-30T10:00:00Z' }
  ] } }).summary();
  A.eq([b.dollars.month_usd, b.dollars.by_offer.kindle], [50, 50], 'dollars add up from the captain-recorded ledger');
  A.eq([b.outcomes.month.done, b.outcomes.month.failed, b.outcomes.working_now, b.outcomes.done_by_district.creative], [1, 1, 1, 1], 'outcomes count this month only, per district');
  A.eq([b.factory.month.done, b.factory.done[0].repo], [1, 'executiveusa/demo-site'], 'factory products finished = intakes settled done');

  // ---- end to end ----
  const ws = path.join(tmp, 'ws'); fs.mkdirSync(ws);
  fs.writeFileSync(path.join(ws, 'agent.roster.json'), JSON.stringify({ agents: ROSTER.map(r => ({ agentId: r.id, name: r.name, role: r.role, district: r.district })) }));
  let release = null;
  const SC = 47000 + Math.floor(Math.random() * 500), GW = SC + 600, TOKEN = 'tok-' + Math.random().toString(36).slice(2);
  const sidecar = http.createServer((q, s) => {
    if (q.url === '/api/status') { s.writeHead(200, { 'content-type': 'application/json' }); return s.end('{"ok":true}'); }
    if (q.url === '/api/missions/run') {
      q.resume();
      return q.on('end', () => { release = () => { s.writeHead(200, { 'content-type': 'application/json' }); s.end(JSON.stringify({ status: 'done', summary: 'ok', crew: [{ agent_id: 'quill', run_id: 'r1', status: 'done' }], usd: 0.04, model: 'deepseek/x', run_id: 'f1' })); }; });
    }
    s.writeHead(404); s.end();
  });
  await new Promise(r => sidecar.listen(SC, '127.0.0.1', r));
  const env = Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(GW), STARNET_PORT: String(SC), STARNET_WORKSPACE_PATH: ws, STARNET_MISSION_DIR: path.join(tmp, 'gm'), STARNET_DISTRICT_STATE: path.join(tmp, 'd.json'), STARNET_SPEND_FILE: path.join(tmp, 'gs.jsonl'), STARNET_KILL_FILE: path.join(tmp, 'gk.json'), STARNET_INTAKE_FILE: path.join(tmp, 'gi.jsonl'), STARNET_REVENUE_FILE: path.join(tmp, 'gr.jsonl'), STARNET_MODEL_DEFAULT_FILE: path.join(tmp, 'gdef.json'), STARNET_OPUS_FILE: path.join(tmp, 'gopus.json'), KB_SUPABASE_URL: '', KB_SUPABASE_SERVICE_KEY: '', LOG_LEVEL: 'error' });
  const child = spawn(process.execPath, [path.join(ROOT, 'gateway', 'server.js')], { env, stdio: 'ignore' });
  const realFetch = global.fetch;
  try {
    const auth = { Authorization: 'Bearer ' + TOKEN };
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { try { await req('GET', GW, '/health', auth); up = true; } catch (_) { await wait(250); } }
    A.ok(up, 'gateway started');
    const idle = JSON.parse((await req('GET', GW, '/v1/city/status', auth)).body);
    A.eq(CityCore.worldWorkSet({ activeTasks: [] }).size, 0, 'no mission, nobody works');
    A.eq(idle.activeTasks.length, 0, 'no mission = no claimed activity');

    const m = await req('POST', GW, '/v1/missions', auth, { mission_id: 'live-1', request_id: 'live-1', trace_id: 't', target: 'starnet', route: 'city', user_intent: '[district:creative] draft the cover brief for client X', permissions: ['research'] });
    A.eq(m.status, 202, 'the mission is accepted');
    for (let i = 0; i < 40 && !release; i++) await wait(100);
    A.ok(!!release, 'the foreman run reached the sidecar');

    const live = JSON.parse((await req('GET', GW, '/v1/city/status', auth)).body);
    const t = live.activeTasks.find(x => x.id === 'mission:live-1');
    A.ok(t && t.status === 'running' && t.context.agentId === 'quill' && t.context.district === 'creative', 'city status: the routed mission runs on the creative agent');
    A.ok(!JSON.stringify(live.activeTasks).includes('client X'), 'city status never carries the intent text');

    // the public DTO (the Netlify function the live city page reads), with the GitHub pulse stubbed offline
    global.fetch = (u, o) => String(u).startsWith('https://api.github.com') ? Promise.resolve(new Response('[]', { status: 503 })) : realFetch(u, o);
    process.env.PAULI_GATEWAY_URL = 'http://127.0.0.1:' + GW; process.env.PAULI_GATEWAY_TOKEN = TOKEN;
    const gw = (await import(pathToFileURL(path.join(ROOT, 'frontend', 'city', 'deploy', 'netlify', 'functions', 'gw.mjs')).href)).default;
    const pub = await (await gw(new Request('https://city.test/.netlify/functions/gw/v1/city/status'))).json();
    const row = pub.activity.find(a => a.state === 'running');
    A.eq(row && row.agent, 'Quill', 'public DTO: the running mission names the agent by public name');
    A.ok(row && ['research', 'comms', 'commerce', 'ops'].includes(row.category) && !('detail' in row), 'public DTO: a fixed category and no detail text');
    const page = CityCore.classifyStatus(pub);   // exactly what city.js hands CityWorld.applyStatus
    A.ok(CityCore.worldWorkSet(page).has('Quill'), 'the 2D world puts Quill to work (walks to its post) on a real mission');
    A.eq(CityCore.worldActivityDiff({}, page, ['Heisenberg', 'Quill']), [{ id: 'Quill', kind: 'task' }], 'only the routed agent moves; Heisenberg stays put');

    release();
    let settled = null;
    for (let i = 0; i < 40 && !settled; i++) { const r = JSON.parse((await req('GET', GW, '/v1/missions/live-1', auth)).body); if (r.status === 'done') settled = r; else await wait(100); }
    A.ok(settled, 'the mission settles done');
    const pub2 = await (await gw(new Request('https://city.test/.netlify/functions/gw/v1/city/status'))).json();
    A.eq(CityCore.worldActivityDiff({ Quill: true }, CityCore.classifyStatus(pub2), ['Heisenberg', 'Quill']), [{ id: 'Quill', kind: 'idle' }], 'the run ended: Quill is released, nothing keeps animating');

    const board = JSON.parse((await req('GET', GW, '/v1/board', auth)).body);
    A.eq([board.outcomes.month.done, board.outcomes.done_by_district.creative], [1, 1], '/v1/board counts the finished outcome');
    A.eq([board.spend.month_usd, board.spend.by_district.creative], [0.04, 0.04], '/v1/board spend matches the settled run');
    A.eq(board.dollars.has_data, false, 'no revenue recorded = no dollars claimed');
    A.eq((await req('POST', GW, '/v1/revenue', auth, { by: 'instinct', usd: 10, offer: 'kindle', ref: 'FO-1' })).status, 403, 'POST /v1/revenue refuses anyone but the captain');
    A.eq((await req('GET', GW, '/v1/board', {})).status, 401, 'the board sits behind the bearer');
  } finally { global.fetch = realFetch; child.kill(); sidecar.close(); }
  A.report();
})().catch(e => { console.log('FAIL: ' + (e && e.stack || e)); process.exit(1); });
