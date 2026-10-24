/* rooms.test.js — meeting rooms (issue #71): manifest validation and the agent-mail proof.
   Unit: every validation rule, loading a directory with good and bad manifests, and each proof state.
   End to end: the real gateway serves GET /v1/rooms from the repo's rooms/ with the real registries, behind the bearer.
   Run: node test/rooms.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const R = require('../gateway/rooms.js');

const ROOT = path.join(__dirname, '..');
const districtIds = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'districts.json'), 'utf8')).districts.map(d => d.id);
const agentIds = R.agentIdsFromYaml(fs.readFileSync(path.join(ROOT, 'registry', 'agents.yaml'), 'utf8'));
const ctx = { districtIds, agentIds };
const good = () => ({ room: { project: 'demo', district: 'production', thread_id: null, chair: 'hermes', members: ['hermes', 'reviewer'], approver: 'owner', files: ['program/factory-v1/CONTEXT.md'], schedule: 'loops/dogfood.md', status: 'active' } });
const errsFor = mut => { const d = good(); mut(d.room); return R.validateRoom(d, ctx); };
const has = (errs, frag) => errs.some(e => e.includes(frag));

function req(method, port, p, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: headers || {} }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', reject); r.end();
  });
}

(async () => {
  // ---- registries ----
  A.eq(agentIds, ['hermes', 'alex', 'fanni'], 'agent roster parsed from registry/agents.yaml');
  A.ok(districtIds.includes('production'), 'district ids come from registry/districts.json');

  // ---- validation ----
  A.eq(R.validateRoom(good(), ctx), [], 'a complete manifest is valid');
  A.ok(has(R.validateRoom({}, ctx), 'missing "room"'), 'no room object');
  A.ok(has(errsFor(r => { r.project = 'Bad Name'; }), 'slug'), 'project must be a slug');
  A.ok(has(errsFor(r => { r.district = 'atlantis'; }), 'not in registry/districts.json'), 'unknown district refused');
  A.ok(has(errsFor(r => { r.members = ['hermes', 'ghost', 'reviewer']; }), '"ghost" is not in registry/agents.yaml'), 'unknown member refused');
  A.ok(has(errsFor(r => { r.members = ['hermes']; }), 'reviewer is a standing member'), 'reviewer must be in every room');
  A.ok(has(errsFor(r => { r.chair = 'alex'; }), 'chair must be one of the members'), 'chair must be a member');
  A.ok(has(errsFor(r => { r.chair = 'reviewer'; }), 'reviewer cannot chair'), 'builder and judge are not the same voice');
  A.ok(has(errsFor(r => { r.approver = ''; }), 'approver must be named'), 'approver required');
  A.ok(has(errsFor(r => { r.files = ['ok', 42]; }), 'files must be a list'), 'files are pointer strings');
  A.ok(has(errsFor(r => { r.schedule = ''; }), 'schedule'), 'schedule required');
  A.ok(has(errsFor(r => { r.status = 'live'; }), 'status must be one of'), 'status enum');
  A.ok(has(errsFor(r => { r.thread_id = 7; }), 'thread_id'), 'thread_id is a string or null');
  A.eq(errsFor(r => { r.thread_id = 'th-1'; }), [], 'an opened thread id is valid');
  A.ok(has(R.validateRoom(good(), Object.assign({ file: '/x/other.json' }, ctx)), 'file name must match'), 'file name must match project');

  // ---- loading: bad manifests are reported, never dropped silently ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rooms-'));
  fs.writeFileSync(path.join(tmp, 'demo.json'), JSON.stringify(good()));
  fs.writeFileSync(path.join(tmp, 'broken.json'), '{ not json');
  const bad = good(); bad.room.project = 'nochair'; bad.room.chair = 'fanni';
  fs.writeFileSync(path.join(tmp, 'nochair.json'), JSON.stringify(bad));
  fs.writeFileSync(path.join(tmp, 'README.md'), 'ignored');
  const loaded = R.loadRooms(tmp, ctx);
  A.eq(loaded.rooms.map(r => r.project), ['demo'], 'only valid manifests become rooms');
  A.ok(loaded.errors.includes('broken.json: unparseable JSON'), 'unparseable manifest reported');
  A.ok(loaded.errors.some(e => e.startsWith('nochair.json: chair')), 'invalid manifest reported with its file name');
  A.ok(has(R.loadRooms(path.join(tmp, 'missing'), ctx).errors, 'rooms directory not found'), 'missing directory is an error, not an empty list');

  // ---- the repo's own rooms are valid ----
  const repoRooms = R.loadRooms(path.join(ROOT, 'rooms'), ctx);
  A.eq(repoRooms.errors, [], 'every manifest in rooms/ is valid');
  A.ok(repoRooms.rooms.some(r => r.project === 'foundry-computer'), 'pilot room exists');

  // ---- proof: only what agent-mail can prove ----
  const room = good().room;
  const none = await R.roomProof(room, { directory: null, projectKey: 'p' });
  A.eq([none.agent_mail, none.registered_members, none.message_count, none.last_message_at], ['not_configured', null, null, null], 'no client: nothing asserted');
  const down = await R.roomProof(room, { directory: async () => { throw new Error('ECONNREFUSED 127.0.0.1:8765'); }, projectKey: 'p' });
  A.eq(down.agent_mail, 'unreachable', 'unreachable agent-mail is a visible state');
  A.ok(/ECONNREFUSED/.test(down.error) && down.registered_members === null, 'error kept, no members claimed');
  const up = await R.roomProof(room, { directory: async () => ({ agents: [{ name: 'starnet-hermes' }, { name: 'someone-else' }] }), projectKey: 'p' });
  A.eq([up.agent_mail, up.registered_members, up.message_count], ['reachable', ['hermes'], null], 'reachable: members agent-mail lists, message count still unproven');
  const empty = await R.roomProof(room, { directory: async () => [], projectKey: 'p' });
  A.eq(empty.registered_members, [], 'reachable but nobody registered: empty, not the manifest list');

  // ---- end to end: the real gateway ----
  const GW = 49500 + Math.floor(Math.random() * 400), TOKEN = 'tok-' + Math.random().toString(36).slice(2);
  const env = Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(GW), STARNET_PORT: String(GW + 1), STARNET_MISSION_DIR: path.join(tmp, 'missions'), STARNET_DISTRICT_STATE: path.join(tmp, 'd.json'), KB_SUPABASE_URL: '', KB_SUPABASE_SERVICE_KEY: '', LOG_LEVEL: 'error' });
  delete env.AGENT_MAIL_URL;
  const child = spawn(process.execPath, [path.join(ROOT, 'gateway', 'server.js')], { env, stdio: 'ignore' });
  try {
    const auth = { Authorization: 'Bearer ' + TOKEN };
    let upGw = false;
    for (let i = 0; i < 40 && !upGw; i++) { try { await req('GET', GW, '/health', auth); upGw = true; } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
    A.ok(upGw, 'gateway started');
    A.eq((await req('GET', GW, '/v1/rooms', {})).status, 401, 'rooms sit behind the gateway bearer');
    const res = await req('GET', GW, '/v1/rooms', auth);
    A.eq(res.status, 200, 'GET /v1/rooms answers');
    const body = JSON.parse(res.body);
    const pilot = body.rooms.find(r => r.project === 'foundry-computer');
    A.ok(pilot && pilot.district === 'production', 'pilot room served from rooms/');
    A.eq(pilot.proof.agent_mail, 'not_configured', 'no AGENT_MAIL_URL: the tile says so');
    A.eq(body.errors, [], 'no manifest errors');
    A.eq(body.degraded, true, 'degraded while agent-mail is not reachable');
  } finally {
    child.kill();
  }
  A.report();
})().catch(e => { console.log('FAIL: ' + (e && e.stack || e)); process.exit(1); });
