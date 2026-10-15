/* node test/e2e.foreman-mission.test.js — StarNet v1 stage 04: a GREEN city mission makes the foreman (HEISENBERG)
   dispatch real crew runs with NOBODY watching, through the host-minted crew grant, and the reply names the crew
   from real worker run events. Also: a non-GREEN mission never starts a run, the foreman cannot summon new agents,
   and the route needs the station token. Boots the REAL sidecar against a mock OpenRouter. No real key/model.
   NOT in test:fast (child-process boot); run via `npm run test:http`. */
'use strict';
const A = require('./_assert.js');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { bootToken } = require('./_httpToken.js');
const HOST = '127.0.0.1';
const INDEX = path.resolve(__dirname, '..', 'sidecar', 'index.js');
const WORKER_MARK = 'CREW_SYS_MARKER';
let chatCalls = 0;

function startMockOpenRouter() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url.indexOf('/models') >= 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'test/model', context_length: 8000, pricing: { prompt: '0', completion: '0' }, supported_parameters: ['tools'] }] }));
        return;
      }
      if (req.url.indexOf('/chat/completions') < 0) { res.writeHead(404); res.end(); return; }
      chatCalls++;
      let body = ''; req.on('data', d => { body += d; }); req.on('end', () => {
        let msgs = []; try { msgs = JSON.parse(body).messages || []; } catch (_) {}
        const sys = (msgs[0] && msgs[0].role === 'system') ? String(msgs[0].content || '') : '';
        const user = String((msgs.find(m => m && m.role === 'user') || {}).content || '');
        const toolMsgs = msgs.filter(m => m && m.role === 'tool');
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        const tool = (id, name, args) => {
          res.write('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id, type: 'function', function: { name, arguments: JSON.stringify(args) } }] } }] }) + '\n\n');
          res.write('data: ' + JSON.stringify({ choices: [{ finish_reason: 'tool_calls', delta: {} }], usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 } }) + '\n\n');
        };
        const text = (t) => { res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: t } }] }) + '\n\n'); res.write('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 } }) + '\n\n'); };
        if (sys.indexOf(WORKER_MARK) >= 0) text('FINDING ' + (/scout-b/.test(sys) ? 'B' : 'A'));
        else if (sys.indexOf('FOREMAN of this station') < 0) text('not a mission run');
        else if (!toolMsgs.length) {
          if (/SUMMON/.test(user)) tool('l_sum', 'team_summon', { specId: 'scout', name: 'NEWBIE', purpose: 'test' });
          else tool('l_disp', 'team_dispatch', { workers: [{ agentId: 'scout-a', prompt: 'angle one' }, { agentId: 'scout-b', prompt: 'angle two' }] });
        } else {
          const last = String(toolMsgs[toolMsgs.length - 1].content || '');
          text(/denied/i.test(last) ? 'SUMMON_DENIED' : ('BRIEF merged: ' + (/FINDING A/.test(last) && /FINDING B/.test(last) ? 'A+B' : 'missing')));
        }
        res.write('data: [DONE]\n\n'); res.end();
      });
    });
    server.listen(0, HOST, () => resolve({ server, base: 'http://' + HOST + ':' + server.address().port + '/api/v1' }));
  });
}

function boot(port, env, attemptsLeft) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [INDEX], { env: Object.assign({}, process.env, env, { SKYNET_PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', settled = false;
    const onData = d => {
      out += d.toString();
      if (!settled && out.indexOf('http://' + HOST + ':' + port) >= 0) { settled = true; resolve({ child, port }); }
      else if (!settled && /already in use/i.test(out)) { settled = true; try { child.kill(); } catch (_) {} if (attemptsLeft > 0) resolve(boot(port + 1, env, attemptsLeft - 1)); else reject(new Error('no free port')); }
    };
    child.stdout.on('data', onData); child.stderr.on('data', onData);
    child.on('error', e => { if (!settled) { settled = true; reject(e); } });
    setTimeout(() => { if (!settled) { settled = true; try { child.kill(); } catch (_) {} reject(new Error('boot timeout:\n' + out)); } }, 9000);
  });
}

(async () => {
  const mock = await startMockOpenRouter();
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-foreman-'));
  const env = { SKYNET_WORKSPACES: ws, SKYNET_OPENROUTER_BASE: mock.base, OPENROUTER_API_KEY: 'sk-or-v1-fake', SKYNET_FULL_ACCESS: '' };
  const { child, port } = await boot(8980 + (process.pid % 40), env, 20);
  const B = 'http://' + HOST + ':' + port;
  try {
    const token = await bootToken(B, B);
    const H = { 'Content-Type': 'application/json', 'X-StarNet-Token': token, Origin: B };
    const roster = await fetch(B + '/api/roster', { method: 'POST', headers: H, body: JSON.stringify({ agents: [
      { agentId: 'agent', name: 'HEISENBERG', system: 'You are HEISENBERG.', model: 'test/model', provider: 'openrouter', approvalMode: 'ask' },
      { agentId: 'scout-a', name: 'SCOUT A', system: WORKER_MARK + ' scout-a', model: 'test/model', provider: 'openrouter', approvalMode: 'ask' },
      { agentId: 'scout-b', name: 'SCOUT B', system: WORKER_MARK + ' scout-b', model: 'test/model', provider: 'openrouter', approvalMode: 'ask' }
    ] }) });
    A.eq(roster.status, 200, 'roster seeded: foreman + two crew');
    const mission = (b, h) => fetch(B + '/api/missions/run', { method: 'POST', headers: h || H, body: JSON.stringify(b) });

    const noTok = await mission({ mission_id: 'm-0', intent: 'x', tier: 'GREEN' }, { 'Content-Type': 'application/json', Origin: B });
    A.ok(noTok.status === 401 || noTok.status === 403, 'the mission route needs the station token');

    const before = chatCalls;
    const yellow = await mission({ mission_id: 'm-yellow', intent: 'publish a post', tier: 'YELLOW' });
    const yb = await yellow.json();
    A.ok(yellow.status === 409 && yb.status === 'needs_human', 'a non-GREEN mission is refused as needs_human');
    A.eq(chatCalls, before, 'and no model call was made for it');

    const r = await mission({ mission_id: 'm-green-1', intent: 'Heisenberg, a three-point brief on test topics', tier: 'GREEN' });
    const out = await r.json();
    A.eq(r.status, 200, 'GREEN mission answers 200');
    A.eq(out.status, 'done', 'the mission completed: ' + (out.reason || ''));
    A.eq(out.agent_id, 'agent', 'run as the foreman');
    const ids = (out.crew || []).map(c => c.agent_id).sort();
    A.ok(ids.length === 2 && ids[0] === 'scout-a' && ids[1] === 'scout-b', 'two real crew runs were dispatched: ' + JSON.stringify(out.crew));
    A.ok(out.crew.every(c => c.status === 'done' && c.run_id), 'each crew run finished, with its own run id');
    A.eq(out.solo, false, 'crew work is not reported as solo');
    A.ok(/BRIEF merged: A\+B/.test(out.summary || ''), 'the foreman merged both crew findings: ' + out.summary);

    const s = await mission({ mission_id: 'm-green-2', intent: 'SUMMON a new agent please', tier: 'GREEN' });
    const so = await s.json();
    A.ok(/SUMMON_DENIED/.test(so.summary || ''), 'the crew grant never lets the foreman create new agents: ' + so.summary);
    A.eq((so.crew || []).length, 0, 'and no crew ran for it');
    A.eq(so.solo, true, 'a mission with no crew is reported as solo');
  } finally {
    try { child.kill(); } catch (_) {}
    try { mock.server.close(); } catch (_) {}
  }
  A.report('e2e.foreman-mission.test');
})().catch(e => { console.error(e); process.exit(1); });
