/* district-foreman.test.js — one district list, per-district queues and Heisenberg's tick (program/city-247).
   Unit: the generated registry, every decision the foreman can make, and how results fold back into state.
   End to end: the real gateway + mission desk + a stub sidecar crew, with GitHub stubbed, through two ticks:
   an approved issue is dispatched with its district knowledge, settles done, and the board says so.
   Run: node test/district-foreman.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const F = require('../sidecar/district-foreman.js');
const { buildRegistry, render } = require('../scripts/city/build-registry.js');
const { makeForeman } = require('../scripts/district/foreman.js');

const ROOT = path.join(__dirname, '..');
const NOW = Date.parse('2026-10-15T12:00:00Z');
const D = (id, over) => Object.assign({ id, active: true, daily_usd_cap: 1, max_attempts: 3, unattended_permissions: ['research'] }, over);
const issue = (n, district, labels = [], extra = {}) => Object.assign({ number: n, title: 'Task ' + n, body: '', created_at: '2026-10-1' + (n % 10) + 'T00:00:00Z', labels: ['district:' + district].concat(labels).map(name => ({ name })) }, extra);
const items = list => list.map(F.itemFromIssue);
const one = (district, its, state) => F.decide({ districts: [district], items: items(its), state: state || {}, now: NOW })[0];

function req(method, port, p, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: headers || {} }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', reject); r.end();
  });
}

(async () => {
  // ---- one district list ----
  const reg = buildRegistry();
  A.eq(reg.districts.length, 12, 'the registry has the 12 CitySpec districts');
  A.eq(render(reg), fs.readFileSync(path.join(ROOT, 'registry', 'districts.json'), 'utf8'), 'registry/districts.json is current (run scripts/city/build-registry.js)');
  A.eq(reg.districts.filter(d => d.active).map(d => d.id).sort(), ['commerce', 'impact', 'production'], 'the first three lanes are active, the rest are honest IDLE');
  A.ok(reg.districts.every(d => d.queue.label === 'district:' + d.id && d.foreman === 'heisenberg'), 'every district has a queue label and Heisenberg as foreman');
  A.ok(reg.districts.find(d => d.id === 'impact').knowledge.includes('cause-specialist'), 'districts carry their knowledge sources');
  A.ok(reg.districts.find(d => d.id === 'production').aliases.includes('factory'), 'old ids map by alias (factory -> production)');

  // ---- decisions ----
  A.eq(one(D('ops', { active: false }), []).action, 'IDLE', 'an inactive lane is IDLE');
  A.ok(/no work queued/.test(one(D('impact'), []).reason), 'an active lane with no work says so (IDLE, never busy)');
  const ask = one(D('impact'), [issue(4, 'impact')]);
  A.ok(ask.action === 'BLOCKED' && /Approve #4/.test(ask.question), 'unapproved work blocks with the exact approval question');
  const go = one(D('impact'), [issue(4, 'impact', ['approved'])]);
  A.ok(go.action === 'DISPATCH' && go.issue === 4 && go.attempt === 1, 'approved research work is dispatched');
  const perm = one(D('commerce'), [issue(5, 'commerce', ['approved', 'perm:store.publish'])]);
  A.ok(perm.action === 'BLOCKED' && /store.publish/.test(perm.question), 'work needing more than unattended permissions blocks instead of running');
  A.eq(one(D('impact'), [issue(4, 'impact', ['approved'])], { districts: { impact: { inflight: { issue: 9, mission_id: 'm' } } } }).action, 'RUNNING', 'one item in flight per district: RUNNING');
  const broke = one(D('impact'), [issue(4, 'impact', ['approved'])], { districts: { impact: { spend: { day: '2026-10-15', usd: 1.2 } } } });
  A.ok(broke.action === 'BLOCKED' && /Daily budget used/.test(broke.question), 'a spent daily budget blocks with the numbers');
  A.eq(one(D('impact'), [issue(4, 'impact', ['approved'])], { districts: { impact: { spend: { day: '2026-10-14', usd: 9 } } } }).action, 'DISPATCH', 'the budget resets on a new UTC day');
  const tired = one(D('impact'), [issue(4, 'impact', ['approved'])], { districts: { impact: { attempts: { 4: 3 }, last_error: { 4: 'model timeout' } } } });
  A.ok(tired.action === 'BLOCKED' && /failed 3 times: model timeout/.test(tired.question), 'retries are capped and the last error is shown');
  const q = one(D('impact'), [issue(6, 'impact', ['approved', 'blocked'], { body: 'Context.\nQuestion: Which Google account owns the NW Kids profile?' })]);
  A.ok(q.action === 'BLOCKED' && /Which Google account/.test(q.question), 'a blocked item surfaces its Question: line');
  const parked = one(D('impact'), [issue(7, 'impact', ['approved'])], { districts: { impact: { finished: { 7: { status: 'needs_human', mission_id: 'm7', why: 'publishing needs the owner' } } } } });
  A.ok(parked.action === 'BLOCKED' && /publishing needs the owner/.test(parked.question), 'a mission parked for the owner keeps the district BLOCKED with its reason');
  A.eq(one(D('impact'), [issue(8, 'impact', ['approved'], { pull_request: {} })]).action, 'IDLE', 'pull requests are not queue items');
  const unread = F.decide({ districts: [D('impact', { queue: { repo: 'o/r' } })], items: [], state: {}, now: NOW, queueErrors: { 'o/r': 'Issues are disabled on this repo' } })[0];
  A.ok(unread.action === 'BLOCKED' && /cannot be read: Issues are disabled/.test(unread.question), 'an unreadable queue blocks with the reason; it is never reported as an empty IDLE queue');
  const order = one(D('impact'), [issue(12, 'impact', ['approved'], { created_at: '2026-10-12T00:00:00Z' }), issue(11, 'impact', ['approved'], { created_at: '2026-10-11T00:00:00Z' })]);
  A.eq(order.issue, 11, 'the oldest approved item goes first');
  const many = F.decide({ districts: [D('a'), D('b'), D('c')], items: items([issue(1, 'a', ['approved']), issue(2, 'b', ['approved']), issue(3, 'c', ['approved'])]), state: {}, now: NOW, maxDispatch: 2 });
  A.eq(many.map(x => x.action), ['DISPATCH', 'DISPATCH', 'IDLE'], 'one tick never starts more than maxDispatch missions');

  // ---- settling results ----
  const inflight = { issue: 4, mission_id: 'm4' };
  const done = F.settle({ inflight }, inflight, { status: 'done', receipt_id: 'rcpt_1', runtime: { usd: 0.25 } }, NOW);
  A.ok(done.inflight === null && done.finished[4].receipt_id === 'rcpt_1' && done.spend.usd === 0.25, 'done: finished with its receipt, spend counted');
  const fail = F.settle({ inflight }, inflight, { status: 'failed', failures: ['no model configured'], runtime: { usd: 0.1 } }, NOW);
  A.ok(fail.attempts[4] === 1 && /no model/.test(fail.last_error[4]) && !fail.finished[4], 'failed: an attempt is counted and the error kept');
  const more = F.settle(done, inflight, { status: 'failed', runtime: { usd: 0.5 } }, NOW);
  A.eq(more.spend.usd, 0.75, 'spend accumulates within the UTC day');
  A.eq(F.settle({}, inflight, { status: 'working' }, NOW).inflight, undefined, 'a still-working mission does not change the item');

  // ---- end to end: real gateway + mission desk + stub crew, stubbed GitHub ----
  const GW = 49000 + Math.floor(Math.random() * 500), SC = GW + 1, TOKEN = 'tok-' + Math.random().toString(36).slice(2);
  let crewBrief = null;
  const sidecar = http.createServer((q2, s) => {
    if (q2.url === '/api/missions/run') {
      const c = []; q2.on('data', d => c.push(d));
      return q2.on('end', () => {
        const b = JSON.parse(Buffer.concat(c).toString('utf8')); crewBrief = b.intent;
        s.writeHead(200, { 'content-type': 'application/json' });
        s.end(JSON.stringify({ mission_id: b.mission_id, run_id: 'run-lead', status: 'done', solo: false, summary: 'Ad Grants checklist drafted.', crew: [{ agent_id: 'scout', run_id: 'run-s', status: 'done' }], usd: 0.02 }));
      });
    }
    s.writeHead(404); s.end();
  });
  await new Promise(r => sidecar.listen(SC, r));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-e2e-'));
  const stateFile = path.join(tmp, 'districts-state.json');
  const child = spawn(process.execPath, [path.join(ROOT, 'gateway', 'server.js')], {
    env: Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(GW), STARNET_PORT: String(SC), STARNET_MISSION_DIR: path.join(tmp, 'missions'), STARNET_DISTRICT_STATE: stateFile, STARNET_REVISION: 'test-rev', KB_SUPABASE_URL: '', KB_SUPABASE_SERVICE_KEY: '', LOG_LEVEL: 'error' }),
    stdio: 'ignore'
  });
  try {
    const auth = { Authorization: 'Bearer ' + TOKEN };
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { try { await req('GET', GW, '/health', auth); up = true; } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
    A.ok(up, 'gateway started');
    A.eq((await req('GET', GW, '/v1/districts', auth)).status, 503, 'before any tick the board says the foreman has not run');

    const ghCalls = [];
    const queue = [
      issue(21, 'impact', ['approved'], { title: 'Grant readiness checklist for Google Ad Grants', body: 'Draft only. Nothing is submitted.' }),
      issue(22, 'commerce', [], { title: 'Top 20 free speech designs research' }),
      issue(23, 'production', ['approved', 'perm:repo.write'], { title: 'Ship the smart-site form' })
    ];
    const fetchImpl = async (url, init = {}) => {
      if (url.startsWith('https://api.github.com/')) {
        ghCalls.push({ url, method: init.method || 'GET', body: init.body });
        const isRepo = /^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+$/.test(url);
        const body = (init.method || 'GET') === 'GET' ? JSON.stringify(isRepo ? { has_issues: true } : queue) : '{}';
        return { ok: true, status: 200, text: async () => body };
      }
      return fetch(url, init);
    };
    const env = { GATEWAY_URL: 'http://127.0.0.1:' + GW, GATEWAY_BEARER_TOKEN: TOKEN, STARNET_DISTRICT_STATE: stateFile, GITHUB_TOKEN: 'gh-test', FOREMAN_GITHUB_WRITE: '1' };
    const foreman = makeForeman({ env, fetchImpl });

    const b1 = await foreman.tick();
    const by1 = Object.fromEntries(b1.districts.map(d => [d.district, d]));
    A.eq(b1.errors, [], 'tick 1 ran without errors');
    A.ok(by1.impact.action === 'DISPATCH' && by1.impact.mission_id === 'd-impact-21-a1', 'tick 1: Impact dispatched the approved issue as a city mission');
    A.ok(by1.commerce.action === 'BLOCKED' && /Approve #22/.test(by1.commerce.question), 'tick 1: Commerce asks for approval of its unapproved issue');
    A.ok(by1.production.action === 'BLOCKED' && /repo.write/.test(by1.production.question), 'tick 1: Production will not run repo.write unattended');
    A.ok(by1.revenue.action === 'IDLE' && /not active/.test(by1.revenue.reason), 'tick 1: inactive districts are IDLE, not faked busy');

    let missionStatus = null;
    for (let i = 0; i < 40; i++) { missionStatus = JSON.parse((await req('GET', GW, '/v1/missions/d-impact-21-a1', auth)).body).status; if (missionStatus !== 'working') break; await new Promise(r => setTimeout(r, 100)); }
    A.eq(missionStatus, 'done', 'the mission desk settled the mission done');
    A.ok(crewBrief && /\[district:impact\] #21 Grant readiness/.test(crewBrief), 'the crew got the issue as its brief');
    A.ok(/District knowledge \(files; cite by source and video id/.test(crewBrief) && /\[(cause-specialist|monica-main) [A-Za-z0-9_-]{11}\]/.test(crewBrief), 'the brief carries cited passages from the district\'s own transcripts');

    const b2 = await foreman.tick();
    const st = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    A.ok(st.districts.impact.finished[21] && st.districts.impact.finished[21].status === 'done' && st.districts.impact.inflight === null, 'tick 2: the result folded back; the item is finished');
    A.eq(st.districts.impact.spend.usd, 0.02, 'tick 2: the mission spend is counted against the lane');
    A.ok(/no work queued|Approve/.test(b2.districts.find(d => d.district === 'impact').reason || b2.districts.find(d => d.district === 'impact').question || ''), 'tick 2: Impact does not re-run finished work');
    const posted = ghCalls.filter(c => c.method === 'POST');
    A.ok(posted.some(c => /issues\/21\/comments/.test(c.url) && /ended \*\*done\*\*/.test(JSON.parse(c.body).body)), 'the result is commented on the issue');
    A.ok(posted.some(c => /issues\/21\/labels/.test(c.url) && /needs-review/.test(c.body)), 'finished work is labeled needs-review for the independent reviewer');

    const board = JSON.parse((await req('GET', GW, '/v1/districts', auth)).body);
    A.ok(board.districts.length === 12 && board.stale === false && typeof board.age_seconds === 'number', 'GET /v1/districts serves the latest board with its age');
    A.eq((await req('GET', GW, '/v1/districts')).status, 401, 'the board needs the gateway bearer');

    const off = makeForeman({ env: { ...env, STARNET_DISTRICT_STATE: path.join(tmp, 'off.json') }, fetchImpl: async (url, init) => url.startsWith('https://api.github.com/repos/') && !/issues/.test(url)
      ? { ok: true, status: 200, text: async () => JSON.stringify({ has_issues: false }) } : fetchImpl(url, init) });
    const offBoard = await off.tick();
    A.ok(offBoard.districts.find(d => d.district === 'impact').action === 'BLOCKED' && /Issues are disabled/.test(offBoard.districts.find(d => d.district === 'impact').question), 'Issues turned off on the queue repo: active districts are BLOCKED with the setting to change, not IDLE');

    const quiet = makeForeman({ env: { ...env, FOREMAN_GITHUB_WRITE: '' }, fetchImpl });
    const before = ghCalls.length;
    await quiet.tick();
    A.ok(ghCalls.slice(before).every(c => c.method === 'GET'), 'without FOREMAN_GITHUB_WRITE=1 the foreman only reads GitHub');
  } finally {
    child.kill(); sidecar.close();
  }

  A.report('district-foreman.test');
})().catch(e => { console.error(e); process.exit(1); });
