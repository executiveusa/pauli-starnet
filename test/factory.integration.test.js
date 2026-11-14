'use strict';
// STARFACTORY-001 integration test. Boots the REAL gateway/workforce-server.js as a child process and drives it over HTTP.
// Paperclip is a contract double (test/helpers/fake-paperclip.js) and the Hermes/Pi/QA executors are stub HTTP services,
// so this proves OUR code paths: delegation, handoff, independent QA, repair loop, idempotency, pause/stop, approval
// gates, budget cap, auth, crash recovery (SIGKILL), and the StarNet read model. It does NOT prove a live Paperclip.
const assert = require('assert');
const http = require('http');
const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { makeFakePaperclip } = require('./helpers/fake-paperclip.js');
const { planNext } = require('../gateway/factory/planner.js');

let n = 0;
const ok = (v, m) => { assert.ok(v, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, label) {
  const end = Date.now() + (ms || 15000);
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error('timed out waiting for ' + label); await sleep(60); }
}
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

const OWNER = 'owner-secret', WORKER = 'worker-secret';
const IDS = { heisenberg: 'agent-heis', pi: 'agent-pi', hermes: 'agent-hermes', qa: 'agent-qa' };

// ---- pure planner: the workflow rules, with no I/O ----
{
  const T = (mid, st, seq, status, a) => ({ id: st + seq, title: '[sf:' + mid + ':' + st + ':' + seq + '] x', status, assigneeAgentId: a });
  eq(planNext({ children: [], verdicts: {}, qaAgentId: 'qa' }).stage, 'implement', 'empty mission starts with implement');
  eq(planNext({ children: [T('m', 'implement', 1, 'in_progress', 'pi')], verdicts: {}, qaAgentId: 'qa' }).type, 'wait', 'unfinished build waits');
  const afterBuild = planNext({ children: [T('m', 'implement', 1, 'done', 'pi')], verdicts: {}, qaAgentId: 'qa' });
  ok(afterBuild.stage === 'review' && afterBuild.role === 'qa', 'finished build hands off to QA');
  const kids = [T('m', 'implement', 1, 'done', 'pi'), T('m', 'review', 2, 'done', 'qa')];
  eq(planNext({ children: kids, verdicts: { review2: { verdict: 'FAIL', findings: ['x'], authorAgentId: 'qa' } }, qaAgentId: 'qa' }).stage, 'repair', 'FAIL returns work to the builder');
  eq(planNext({ children: kids, verdicts: { review2: { verdict: 'PASS', authorAgentId: 'qa' } }, qaAgentId: 'qa' }).type, 'await_acceptance', 'PASS holds for the owner, it does not complete');
  eq(planNext({ children: kids, verdicts: { review2: { verdict: 'PASS', authorAgentId: 'pi' } }, qaAgentId: 'qa' }).type, 'escalate', 'a verdict not written by QA is rejected');
  eq(planNext({ children: kids, verdicts: {}, qaAgentId: 'qa' }).type, 'escalate', 'a review with no verdict escalates, never passes');
  const maxed = [T('m', 'implement', 1, 'done', 'pi'), T('m', 'review', 2, 'done', 'qa'), T('m', 'repair', 3, 'done', 'pi'), T('m', 'review', 4, 'done', 'qa'), T('m', 'repair', 5, 'done', 'pi'), T('m', 'review', 6, 'done', 'qa')];
  eq(planNext({ children: maxed, verdicts: { review6: { verdict: 'FAIL', authorAgentId: 'qa' } }, qaAgentId: 'qa', maxRepairs: 2 }).type, 'escalate', 'retry budget exhausted escalates');
  eq(planNext({ children: [T('m', 'implement', 1, 'done', 'qa'), T('m', 'review', 2, 'done', 'qa')], verdicts: { review2: { verdict: 'PASS', authorAgentId: 'qa' } }, qaAgentId: 'qa' }).type, 'escalate', 'builder and reviewer being the same agent escalates');
}

async function main() {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starfactory-'));
  const gwPort = await freePort();
  const exPort = await freePort();

  // ---- stub executors (what Hermes / Pi / QA would do) ----
  const ex = { calls: [], hang: new Set(), released: new Set(), qaQueue: {}, usd: {} };
  const exServer = http.createServer((req, res) => {
    const chunks = []; req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      const b = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const worker = req.url.split('/').pop();
      const title = b.task.title;
      const mid = b.mission;
      ex.calls.push({ worker, taskId: b.task.id, runId: b.runId, role: b.role, mission: mid, title });
      const key = mid + ':' + worker;
      if (ex.hang.has(key) && !ex.released.has(key)) await until(() => ex.released.has(key), 20000, 'release ' + key).catch(() => {});
      const out = { ok: true, summary: worker + ' finished ' + title, artifacts: [{ type: 'commit', ref: 'git:deadbeef-' + b.runId }], usd: ex.usd[key] || 0 };
      if (b.role === 'qa') { const q = ex.qaQueue[mid] || ['PASS']; out.verdict = q.length > 1 ? q.shift() : q[0]; out.findings = out.verdict === 'FAIL' ? ['missing test for edge case'] : []; }
      const s = JSON.stringify(out); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(s);
    });
  });
  await new Promise(r => exServer.listen(exPort, '127.0.0.1', r));

  // ---- Paperclip double ----
  const wakeBase = 'http://127.0.0.1:' + gwPort + '/v1/factory/wake/';
  const wh = { Authorization: 'Bearer ' + WORKER };
  const pc = makeFakePaperclip({
    companyId: 'co-1',
    tokens: { svc: { type: 'board' }, 'key-pi': { type: 'agent', agentId: IDS.pi }, 'key-hermes': { type: 'agent', agentId: IDS.hermes }, 'key-qa': { type: 'agent', agentId: IDS.qa } },
    agents: [
      { id: IDS.heisenberg, name: 'Heisenberg', role: 'chief_of_staff' },
      { id: IDS.pi, name: 'Pi', role: 'engineer', wakeUrl: wakeBase + 'pi', wakeHeaders: wh },
      { id: IDS.hermes, name: 'Hermes', role: 'executor', wakeUrl: wakeBase + 'hermes', wakeHeaders: wh },
      { id: IDS.qa, name: 'QA', role: 'qa', wakeUrl: wakeBase + 'qa', wakeHeaders: wh }
    ]
  });
  const pcUrl = await pc.listen();

  const roles = {
    heisenberg: { agentId: IDS.heisenberg },
    pi: { agentId: IDS.pi, apiKey: 'key-pi', executor: { type: 'http', url: 'http://127.0.0.1:' + exPort + '/run/pi', idempotent: true } },
    hermes: { agentId: IDS.hermes, apiKey: 'key-hermes', executor: { type: 'http', url: 'http://127.0.0.1:' + exPort + '/run/hermes', idempotent: false } },
    qa: { agentId: IDS.qa, apiKey: 'key-qa', executor: { type: 'http', url: 'http://127.0.0.1:' + exPort + '/run/qa', idempotent: true } }
  };
  let gw = null; let gwLog = '';
  async function startGateway() {
    gwLog = '';
    gw = spawn(process.execPath, [path.join(__dirname, '..', 'gateway', 'workforce-server.js')], {
      env: Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: OWNER, GATEWAY_PORT: String(gwPort), GATEWAY_HOST: '127.0.0.1', PAPERCLIP_URL: pcUrl, PAPERCLIP_TOKEN: 'svc', PAPERCLIP_COMPANY_ID: 'co-1', FACTORY_ROLES: JSON.stringify(roles), FACTORY_WORKER_TOKEN: WORKER, FACTORY_STATE_DIR: stateDir, FACTORY_POLL_MS: '150', FACTORY_RECONCILE_MS: '60000' }),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    gw.stdout.on('data', d => { gwLog += d; }); gw.stderr.on('data', d => { gwLog += d; });
    await until(() => /\[FACTORY\] started/.test(gwLog), 10000, 'gateway start');
  }
  const killGateway = () => new Promise(r => { if (!gw) return r(); gw.once('exit', () => r()); gw.kill('SIGKILL'); });
  async function api(method, p, body, token) {
    const res = await fetch('http://127.0.0.1:' + gwPort + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token === null ? {} : { Authorization: 'Bearer ' + (token || OWNER) }), body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch { /* non-json */ }
    return { code: res.status, body: j };
  }
  const issues = () => [...pc.state.issues.values()];
  const missionStatus = async (mid) => (await api('GET', '/v1/factory/missions/' + mid)).body;
  const callsFor = (mid, worker) => ex.calls.filter(c => c.mission === mid && (!worker || c.worker === worker));

  await startGateway();
  try {
    // ---- T15: unauthorized access is rejected and no work happens ----
    eq((await api('GET', '/v1/factory/state', undefined, null)).code, 401, 'T15 owner API without a token is 401');
    eq((await api('GET', '/v1/factory/state', undefined, WORKER)).code, 401, 'T15 the worker token is not an owner credential');
    eq((await api('POST', '/v1/factory/wake/pi', { runId: 'r-x', agentId: IDS.pi, context: { taskId: 't' } }, null)).code, 401, 'T15 wake without a token is 401');
    eq((await api('POST', '/v1/factory/wake/pi', { runId: 'r-x', agentId: IDS.pi, context: { taskId: 't' } }, OWNER)).code, 401, 'T15 the owner token cannot impersonate Paperclip waking a worker');
    eq((await api('POST', '/v1/factory/wake/pi', { runId: 'r-y', agentId: IDS.qa, context: { taskId: 't' } }, WORKER)).code, 403, 'T15 a wake whose agent id does not match the worker is 403');
    eq(ex.calls.length, 0, 'T15 no executor ran for any rejected request');

    // ---- main mission: implement -> QA FAIL -> repair -> QA PASS -> owner acceptance ----
    ex.qaQueue['M-001'] = ['FAIL', 'PASS'];
    const early = await api('POST', '/v1/factory/missions/M-001/accept', { approver: 'owner' });
    eq(early.code, 404, 'accepting an unknown mission is 404');
    const sub = await api('POST', '/v1/factory/missions', { mission_id: 'M-001', user_intent: 'Add a widget to the dashboard', permissions: ['read', 'repo.edit', 'pr.create'], budget_usd: 5 });
    eq(sub.code, 202, 'mission accepted');
    const dup = await api('POST', '/v1/factory/missions', { mission_id: 'M-001', user_intent: 'Add a widget to the dashboard', permissions: ['read'] });
    ok(dup.code === 200 && dup.body.duplicate === true, 'resubmitting the same mission id finds the existing Paperclip mission, it does not create a second');
    eq(issues().filter(i => /^\[sf:M-001\]/.test(i.title)).length, 1, 'exactly one canonical mission issue in Paperclip');
    const noPass = await api('POST', '/v1/factory/missions/M-001/accept', { approver: 'owner' });
    eq(noPass.code, 409, 'T10 owner acceptance is refused while no independent PASS exists');

    await until(async () => (await missionStatus('M-001')).status === 'in_review', 20000, 'M-001 to reach owner acceptance');
    const s1 = await missionStatus('M-001');
    eq(s1.tasks.map(t => t.stage + ':' + t.seq), ['implement:1', 'review:2', 'repair:3', 'review:4'], 'T03/T05 the chain is implement, review, repair, review, created with no human relaying');
    eq(s1.tasks.map(t => t.assigneeAgentId), [IDS.pi, IDS.qa, IDS.pi, IDS.qa], 'T02/T03 builder, reviewer, builder, reviewer');
    ok(s1.tasks.every(t => t.status === 'done'), 'every stage task is done in Paperclip');
    const verdicts = Object.values(s1.verdicts);
    eq(verdicts.map(v => v.verdict), ['FAIL', 'PASS'], 'T04/T05 QA failed the first attempt and passed the repair');
    ok(verdicts.every(v => v.authorAgentId === IDS.qa), 'T04 every verdict was authored by the QA agent credential, not by the builder');
    const runs = callsFor('M-001');
    ok(new Set(runs.map(r => r.runId)).size === runs.length, 'T02 each stage had its own real worker run id');
    ok(runs.every(r => r.mission === 'M-001'), 'T03 the mission id followed the work through every handoff');
    eq(runs.map(r => r.worker), ['pi', 'qa', 'pi', 'qa'], 'executors invoked in handoff order');
    ok(pc.state.wakes.length >= 4, 'Paperclip woke the workers (we never called wake ourselves)');
    eq(s1.next.type, 'await_acceptance', 'mission holds for the owner');
    ok(issues().find(i => /^\[sf:M-001\]/.test(i.title)).status === 'in_review', 'T10 mission is in_review, not done: nothing completes on a worker say-so');
    const commits = [...pc.state.comments.values()].flat().filter(c => /Artifacts: git:deadbeef/.test(c.body));
    ok(commits.length >= 4, 'T17 each completed task carries its artifact reference to the run');

    // ---- T07: a duplicate wake does not repeat the side effect ----
    const firstPi = runs[0];
    const before = ex.calls.length;
    const dupWake = await api('POST', '/v1/factory/wake/pi', { runId: firstPi.runId, agentId: IDS.pi, companyId: 'co-1', context: { taskId: firstPi.taskId } }, WORKER);
    ok(dupWake.code === 200 && dupWake.body.duplicate === true, 'T07 replayed wake is acknowledged as a duplicate');
    await sleep(300);
    eq(ex.calls.length, before, 'T07 the duplicate caused no second execution');

    // ---- owner acceptance, then read model ----
    const acc = await api('POST', '/v1/factory/missions/M-001/accept', { approver: 'owner' }, null);
    eq(acc.code, 401, 'T15 accept without owner token is 401');
    const acc2 = await api('POST', '/v1/factory/missions/M-001/accept', { approver: 'owner' });
    ok(acc2.code === 200 && acc2.body.status === 'done', 'owner acceptance after independent PASS completes the mission');

    // ---- T10: restricted permissions park the mission; the exact scope must be authorized ----
    const callsBefore = ex.calls.length;
    const park = await api('POST', '/v1/factory/missions', { mission_id: 'M-deploy', user_intent: 'Ship the widget to production', permissions: ['repo.edit', 'deploy'] });
    ok(park.code === 202 && park.body.status === 'blocked' && park.body.needs_authorization.includes('deploy'), 'T10 deploy permission parks the mission');
    await sleep(300);
    eq(ex.calls.length, callsBefore, 'T10 no worker ran for the parked mission');
    eq(issues().filter(i => /^\[sf:M-deploy:/.test(i.title)).length, 0, 'T10 no task was even created before authorization');
    const undeclared = await api('POST', '/v1/factory/missions', { mission_id: 'M-undecl', user_intent: 'Do something' });
    ok(undeclared.code === 202 && undeclared.body.status === 'blocked', 'undeclared permissions fail closed');
    eq((await api('POST', '/v1/factory/missions/M-deploy/authorize', { permissions: ['repo.edit'], approver: 'owner' })).code, 409, 'T10 authorizing the wrong scope is refused');
    ex.qaQueue['M-deploy'] = ['PASS'];
    const auth = await api('POST', '/v1/factory/missions/M-deploy/authorize', { permissions: ['deploy'], approver: 'owner' });
    eq(auth.code, 200, 'T10 authorizing exactly the restricted scope releases the mission');
    await until(async () => (await missionStatus('M-deploy')).status === 'in_review', 15000, 'M-deploy to finish after authorization');

    // ---- T08/T09: pause stops new work; resume continues it ----
    eq((await api('POST', '/v1/factory/agents/pi/pause')).code, 200, 'pause Pi');
    ex.qaQueue['M-pause'] = ['PASS'];
    await api('POST', '/v1/factory/missions', { mission_id: 'M-pause', user_intent: 'Work while Pi is paused', permissions: ['read', 'repo.edit'] });
    await sleep(500);
    eq(callsFor('M-pause').length, 0, 'T08 no work started while Pi is paused');
    const stray = issues().find(i => /^\[sf:M-pause:implement:1\]/.test(i.title));
    eq(stray.status, 'todo', 'T08 the task waits in Paperclip');
    await api('POST', '/v1/factory/wake/pi', { runId: 'run-stray', agentId: IDS.pi, companyId: 'co-1', context: { taskId: stray.id } }, WORKER);
    await sleep(300);
    eq(callsFor('M-pause').length, 0, 'T08 even a stray wake does not run a paused agent');
    await api('POST', '/v1/factory/agents/pi/resume');
    await until(async () => (await missionStatus('M-pause')).status === 'in_review', 15000, 'M-pause to continue after resume');
    ok(callsFor('M-pause', 'pi').length === 1, 'T09 resumed Pi picked up the waiting task exactly once');

    // ---- T14: budget cap blocks further work ----
    ex.usd['M-budget:pi'] = 0.02; ex.qaQueue['M-budget'] = ['PASS'];
    await api('POST', '/v1/factory/missions', { mission_id: 'M-budget', user_intent: 'Costly work', permissions: ['read', 'repo.edit'], budget_usd: 0.01 });
    await until(() => issues().find(i => /^\[sf:M-budget:review:2\]/.test(i.title) && i.status === 'blocked'), 15000, 'budget block');
    eq(callsFor('M-budget', 'qa').length, 0, 'T14 the review did not start once the mission budget was spent');

    // ---- T16: emergency stop ----
    const stop = await api('POST', '/v1/factory/stop', { reason: 'test', by: 'owner' });
    ok(stop.code === 200 && stop.body.stopped === true && stop.body.paused.includes('pi'), 'T16 stop pauses the workers');
    const afterStop = await api('POST', '/v1/factory/wake/qa', { runId: 'run-after-stop', agentId: IDS.qa, companyId: 'co-1', context: { taskId: 'whatever' } }, WORKER);
    eq(afterStop.code, 503, 'T16 new execution is refused while stopped');
    const stState = (await api('GET', '/v1/factory/state')).body;
    ok(stState.stopped === true && Object.values(stState.agents).every(a => a.state === 'blocked'), 'T11/T16 StarNet projection shows every agent blocked by the stop, with evidence');
    await api('POST', '/v1/factory/resume');

    // ---- T06: crash recovery of an idempotent worker (SIGKILL mid-run) ----
    ex.hang.add('M-crash:pi'); ex.qaQueue['M-crash'] = ['PASS'];
    await api('POST', '/v1/factory/missions', { mission_id: 'M-crash', user_intent: 'Long implementation', permissions: ['read', 'repo.edit'] });
    await until(() => callsFor('M-crash', 'pi').length === 1, 10000, 'Pi to start M-crash');
    const live = await until(async () => { const st = (await api('GET', '/v1/factory/state')).body; return st.agents.pi && st.agents.pi.state === 'working' ? st : null; }, 8000, 'projection to show Pi working');
    ok(live.agents.pi.evidence.runId === callsFor('M-crash', 'pi')[0].runId && live.agents.pi.evidence.source === 'bridge-checkpoint', 'T11 the displayed "working" state is backed by the real run id');
    await killGateway();
    ex.released.add('M-crash:pi');
    await startGateway();
    await until(async () => (await missionStatus('M-crash')).status === 'in_review', 20000, 'M-crash to complete after recovery');
    const crashPi = callsFor('M-crash', 'pi');
    ok(crashPi.length === 2 && crashPi[0].taskId === crashPi[1].taskId, 'T06 the interrupted task was resumed once after the restart');
    eq(issues().filter(i => /^\[sf:M-crash:implement:1\]/.test(i.title) && i.status === 'done').length, 1, 'T06 the task finished exactly once');
    const cp = JSON.parse(fs.readFileSync(path.join(stateDir, 'checkpoints', crashPi[0].taskId + '.json'), 'utf8'));
    ok(cp.phase === 'completed' && cp.retry === 1, 'T06 the checkpoint records one recovery');

    // ---- T06/T07: a NON-idempotent worker is never silently repeated ----
    ex.hang.add('M-herm:hermes');
    const hi = await fetch(pcUrl + '/api/companies/co-1/issues', { method: 'POST', headers: { Authorization: 'Bearer svc', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '[sf:M-herm:implement:1] publish release notes', description: 'external publish', status: 'todo', assigneeAgentId: IDS.hermes }) }).then(r => r.json());
    await until(() => callsFor('M-herm', 'hermes').length === 1, 10000, 'Hermes to start');
    await killGateway();
    ex.released.add('M-herm:hermes');
    await startGateway();
    await until(() => pc.state.issues.get(hi.id).status === 'blocked', 10000, 'visible failure for the interrupted non-idempotent task');
    await sleep(300);
    eq(callsFor('M-herm', 'hermes').length, 1, 'T06/T07 the non-idempotent worker was NOT re-run after the crash');
    ok([...pc.state.comments.get(hi.id)].some(c => /not safe to resume/.test(c.body)), 'T06 the interruption is stated in Paperclip, not hidden');
    ok(pc.state.issues.get(hi.id).status !== 'done', 'a task that died mid-run is never reported done');

    // ---- T11/T20: the read model and its event stream ----
    // One more mission AFTER the last restart, so the replay below is checked against work this process actually did.
    ex.qaQueue['M-final'] = ['PASS']; ex.hang.add('M-final:pi');
    await api('POST', '/v1/factory/missions', { mission_id: 'M-final', user_intent: 'Final small change', permissions: ['read', 'repo.edit'] });
    await until(() => callsFor('M-final', 'pi').length === 1, 10000, 'Pi to start M-final');
    await sleep(600);                       // long enough for at least one projection poll to observe the live run
    ex.released.add('M-final:pi');
    await until(async () => (await missionStatus('M-final')).status === 'in_review', 15000, 'M-final to reach owner acceptance');
    const state = (await api('GET', '/v1/factory/state')).body;
    ok(Array.isArray(state.states) && state.states.includes('awaiting_approval') && state.states.includes('recovering'), 'projection exposes the full state vocabulary');
    ok(Object.values(state.agents).every(a => a.evidence && a.evidence.source), 'T20 every agent state carries its evidence source');
    ok(state.agents.heisenberg.state === 'awaiting_approval' || state.agents.heisenberg.state === 'blocked' || state.agents.heisenberg.state === 'waiting', 'Heisenberg reflects held missions');
    async function readSse(headers, ms) {
      return new Promise((resolve) => {
        const events = []; let buf = '';
        const req = http.get({ host: '127.0.0.1', port: gwPort, path: '/v1/factory/events', headers: Object.assign({ Authorization: 'Bearer ' + OWNER }, headers) }, res => {
          res.on('data', d => { buf += d; const parts = buf.split('\n\n'); buf = parts.pop(); for (const p of parts) { const m = /^id: (.*)\nevent: (.*)\ndata: (.*)$/m.exec(p); if (m) events.push({ id: m[1], type: m[2], data: JSON.parse(m[3]) }); } });
        });
        setTimeout(() => { req.destroy(); resolve(events); }, ms);
      });
    }
    const fresh = await readSse({}, 500);
    eq(fresh[0].type, 'factory.resync', 'a new subscriber gets a full resync, not a guess');
    const epoch = fresh[0].id.split('-')[0];
    const replay = await readSse({ 'Last-Event-ID': epoch + '-0' }, 500);
    // The ring is per server process (a restart changes the epoch and forces a resync), so replay is checked on work that ran after the restarts.
    ok(replay.some(e => e.type === 'factory.handoff' && e.data.mission === 'M-final' && e.data.stage === 'review' && e.data.to === 'qa'), 'T11 reconnect replays the real Heisenberg-to-QA handoff');
    ok(replay.some(e => e.type === 'factory.agent.state' && e.data.to === 'working' && e.data.evidence && e.data.evidence.runId), 'T11 replay includes a working transition with its run id');
    const stale = await readSse({ 'Last-Event-ID': 'deadbeef-3' }, 400);
    eq(stale[0].type, 'factory.resync', 'a client from a different server epoch is resynced, never fed a fabricated gap');

    // ---- known issue A: in factory mode the in-memory Map is not the mission store ----
    const wf = await api('GET', '/v1/workforce/missions/M-001');
    ok(wf.code === 200 && wf.body.authority === 'paperclip', 'known issue A: /v1/workforce/missions reads Paperclip, not a process-local Map');
  } finally {
    await killGateway().catch(() => {});
    await pc.close(); exServer.close();
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
}

main().then(() => { console.log('factory.integration.test.js: ' + n + ' assertions passed'); process.exit(0); }, (e) => { console.error(e && e.stack || e); process.exit(1); });
