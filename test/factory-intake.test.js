/* factory-intake.test.js - the factory intake queue (program/starnet-v2/02_intake-and-inbox).
   Unit: validation, grill answers vs assumed answers (morning approval flag), duplicate repo, the 5-a-day cap and the
   UTC day rollover. End to end: the real gateway accepts 5, refuses the 6th, and lists the day, behind the bearer.
   Run: node test/factory-intake.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { makeIntake } = require('../gateway/intake.js');

const ROOT = path.join(__dirname, '..');
function req(method, port, p, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}) }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
  });
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-'));
  let clock = Date.parse('2026-10-25T20:00:00Z');
  const q = makeIntake(path.join(tmp, 'q.jsonl'), { now: () => clock });
  const base = n => ({ repo: 'executiveusa/repo-' + n, instructions: 'Build the PRD for repo ' + n, submitted_by: 'instinct' });

  // ---- validation ----
  A.eq(q.submit({ ...base(1), repo: 'https://github.com/x/y' }).code, 400, 'repo must be owner/name, not a URL');
  A.eq(q.submit({ ...base(1), branch: '../etc' }).code, 400, 'path-like branch refused');
  A.eq(q.submit({ ...base(1), instructions: '' }).code, 400, 'instructions required');
  A.eq(q.submit({ ...base(1), submitted_by: 'stranger' }).code, 400, 'only instinct or the command center submit');
  A.eq(q.submit({ ...base(1), grill: [{ question: 'Stack?' }] }).code, 400, 'an unanswered question needs a recommended answer to assume');

  // ---- grill answers vs assumed ----
  const r1 = q.submit({ ...base(1), grill: [{ question: 'Stack?', answer: 'Next.js' }, { question: 'Auth?', recommended: 'Magic links' }] });
  A.eq(r1.code, 201, 'first intake accepted');
  A.eq(r1.body.intake.assumed_answers, 1, 'one assumed answer counted');
  A.eq(r1.body.intake.needs_morning_approval, true, 'assumed answers park for the morning');
  A.eq(r1.body.intake.grill[1].answer, 'Magic links', 'the recommended answer is what gets assumed');
  A.eq(r1.body.intake.branch, 'main', 'branch defaults to main');
  A.eq(r1.body.remaining_today, 4, 'four slots left');
  A.eq(q.submit({ ...base(2), grill: [{ question: 'Stack?', answer: 'Go' }] }).body.intake.needs_morning_approval, false, 'fully answered grill needs no morning approval');
  A.eq(q.submit(base(1)).code, 409, 'same repo twice in a day refused');

  // ---- the 5-a-day cap ----
  for (const n of [3, 4, 5]) A.eq(q.submit(base(n)).code, 201, 'intake ' + n + ' accepted');
  const sixth = q.submit(base(6));
  A.eq(sixth.code, 429, 'Heisenberg refuses the 6th repo');
  A.eq(sixth.body.error, 'DAILY_INTAKE_CAP', 'refusal says why');
  A.eq(q.list().remaining, 0, 'no slots left today');
  A.eq(q.list().intakes.map(r => r.id), ['intake-2026-10-25-1', 'intake-2026-10-25-2', 'intake-2026-10-25-3', 'intake-2026-10-25-4', 'intake-2026-10-25-5'], 'ids are day + order');

  // ---- the captain's morning approval (assumed answers) ----
  const assumedRow = q.list().intakes.find(r => r.needs_morning_approval);
  const plainRow = q.list().intakes.find(r => !r.needs_morning_approval);
  A.ok(assumedRow && plainRow, 'the day holds one assumed-answer intake and one fully answered');
  A.eq(q.approve({ intake_id: assumedRow.id, by: 'instinct', confirm: 'approve' }).code, 403, 'Instinct cannot approve for the captain');
  A.eq(q.approve({ intake_id: assumedRow.id, by: 'captain' }).code, 403, 'approval needs the explicit confirm word');
  A.eq(q.approve({ intake_id: plainRow.id, by: 'captain', confirm: 'approve' }).code, 409, 'nothing to approve on a fully answered intake');
  A.eq(q.approve({ intake_id: 'intake-nope', by: 'captain', confirm: 'approve' }).code, 404, 'unknown intake');
  A.eq(q.approve({ intake_id: assumedRow.id, by: 'captain', confirm: 'approve' }).code, 200, 'the captain approves it');
  A.eq(q.list().intakes.find(r => r.id === assumedRow.id).morning_approved, true, 'the approval shows on the intake (the factory now takes it)');
  A.eq(q.list().intakes.length, 5, 'an approval is not a new intake');

  // ---- next UTC day resets ----
  clock = Date.parse('2026-10-26T00:00:01Z');
  A.eq(q.submit(base(6)).code, 201, 'a new UTC day opens 5 new slots');
  A.eq(q.list('2026-10-25').intakes.length, 5, 'yesterday stays listed by day');

  // ---- end to end: the real gateway ----
  const GW = 49980 + Math.floor(Math.random() * 15), TOKEN = 'tok-' + Math.random().toString(36).slice(2);
  const env = Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(GW), STARNET_PORT: String(GW + 1), STARNET_MISSION_DIR: path.join(tmp, 'm'), STARNET_DISTRICT_STATE: path.join(tmp, 'd.json'), STARNET_INTAKE_FILE: path.join(tmp, 'gw.jsonl'), KB_SUPABASE_URL: '', KB_SUPABASE_SERVICE_KEY: '', LOG_LEVEL: 'error' });
  const child = spawn(process.execPath, [path.join(ROOT, 'gateway', 'server.js')], { env, stdio: 'ignore' });
  try {
    const auth = { Authorization: 'Bearer ' + TOKEN };
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { try { await req('GET', GW, '/health', auth); up = true; } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
    A.ok(up, 'gateway started');
    A.eq((await req('POST', GW, '/v1/factory/intake', {}, base(1))).status, 401, 'intake sits behind the bearer');
    for (const n of [1, 2, 3, 4, 5]) A.eq((await req('POST', GW, '/v1/factory/intake', auth, base(n))).status, 201, 'gateway accepts intake ' + n);
    A.eq((await req('POST', GW, '/v1/factory/intake', auth, base(6))).status, 429, 'gateway refuses the 6th');
    const listed = JSON.parse((await req('GET', GW, '/v1/factory/intake', auth)).body);
    A.eq([listed.intakes.length, listed.remaining], [5, 0], 'gateway lists today with no slots left');
    A.eq((await req('DELETE', GW, '/v1/factory/intake', auth)).status, 405, 'no other methods');
  } finally { child.kill(); }
  A.report();
})().catch(e => { console.log('FAIL: ' + (e && e.stack || e)); process.exit(1); });
