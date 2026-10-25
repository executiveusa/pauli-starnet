/* offers.test.js - mission templates for the money loops (program/starnet-v2/10_offers).
   Every template in registry/offers passes the structural check against the real persona library and district
   registry (allowed personas only, known districts, a judge step, a red step). plan() turns the green steps up to the
   first gate into MissionEnvelopes the mission desk accepts as GREEN; gated steps never become missions; inputs are
   pattern-checked so client data cannot be pasted into an intent. Run: node test/offers.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadTemplates, check, plan } = require('../gateway/offers.js');
const { validate, tierOf, makeMissionDesk } = require('../gateway/missions.js');

const ROOT = path.join(__dirname, '..');
const personas = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'personas.json'), 'utf8')).personas;
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'districts.json'), 'utf8'));
const districts = reg.districts || reg;

(async () => {
  const T = loadTemplates(path.join(ROOT, 'registry', 'offers'));
  A.eq(Object.keys(T).sort(), ['ai-employee', 'kindle', 'smart-sites'], 'one template per money loop (store paused)');
  for (const t of Object.values(T)) A.eq(check(t, { personas, districts }), [], t.id + ' passes the template check');

  // the check catches what it should
  const broken = JSON.parse(JSON.stringify(T.kindle));
  broken.steps[0].persona = 'engineering/engineering-technical-writer';   // "ask" by the skill guard
  broken.steps[1].district = 'atlantis';
  broken.steps[2].intent += ' {{email}}';
  broken.steps = broken.steps.filter(s => s.tier !== 'red' && !s.judge);
  const probs = check(broken, { personas, districts }).join('\n');
  A.ok(/is ask by the skill guard/.test(probs), 'a guard-held persona is refused');
  A.ok(/unknown district atlantis/.test(probs), 'an unknown district is refused');
  A.ok(/unknown input email/.test(probs), 'an intent cannot reach for an undeclared input');
  A.ok(/no judge step/.test(probs) && /no red step/.test(probs), 'a template without a judge or a red step is refused');

  // Kindle, ebook only
  const k = plan(T.kindle, { job_id: 'kdp-0001', genre: 'self-help', formats: 'ebook' });
  A.eq(k.ready.map(m => m.mission_id.split(':').pop()), ['extract', 'rights', 'edit-mechanics', 'edit-readability'], 'green steps run up to the first gate');
  A.eq([k.gate.step, k.gate.tier, k.gate.owner], ['client-review', 'yellow', 'captain'], 'the client send waits for the captain');
  A.ok(!k.waiting.some(w => w.step === 'format-paperback'), 'ebook-only jobs skip the paperback step');
  A.ok(k.waiting.some(w => w.step === 'publish' && w.tier === 'red'), 'Publish stays a person');
  A.ok(k.ready.every(m => validate(m) === null && tierOf(m) === 'GREEN'), 'every ready step is a valid GREEN MissionEnvelope');
  A.ok(k.ready.every(m => /^\[district:(revenue|creative|production)\] \[persona:[a-z-]+\/[a-z0-9-]+\] /.test(m.user_intent)), 'each mission names its district and persona');
  A.ok(plan(T.kindle, { job_id: 'kdp-0001', genre: 'self-help', formats: 'ebook+paperback' }).waiting.some(w => w.step === 'format-paperback'), 'paperback jobs include the paperback step');

  // inputs are patterns, not free text
  A.ok(/job_id/.test(plan(T.kindle, { genre: 'x y', formats: 'ebook' }).error), 'a missing job id is refused');
  A.ok(/genre/.test(plan(T.kindle, { job_id: 'kdp-2', genre: 'Jane <jane@x.com>', formats: 'ebook' }).error), 'contact details cannot ride in as an input');

  // smart-sites and the AI Employee
  const s = plan(T['smart-sites'], { job_id: 'site-0001', business_type: 'barber shop', repo: 'executiveusa/demo-barber' });
  A.eq([s.ready.length, s.gate.step], [3, 'factory-intake'], 'smart-sites: brief, PRD and design run; the factory intake waits for the captain');
  A.ok(!s.ready.concat(s.waiting).some(x => x.mission_id && /go-live/.test(x.mission_id)), 'go-live never becomes a mission');
  const e = plan(T['ai-employee'], { job_id: 'aie-0001', role: 'front desk' });
  A.eq([e.ready.length, e.gate.step, e.gate.owner], [6, 'client-number', 'client'], 'AI Employee: everything up to the judged rehearsal runs; the client connects their own number');

  // the mission desk accepts the ready steps as GREEN work
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offers-'));
  const seen = [];
  const desk = makeMissionDesk({ stateDir: dir, runForeman: async b => { seen.push(b.intent); return { status: 'done', summary: 'ok' }; } });
  const outs = k.ready.map(m => desk.accept(m));
  A.ok(outs.every(o => o.code === 202), 'all four Kindle steps dispatch');
  await Promise.all(outs.map(o => o.done));
  A.eq(desk.list().filter(m => m.district === 'revenue').length, 4, 'the desk files them under the revenue district');
  A.eq(desk.accept(k.ready[0]).code, 200, 'replanning the same job never runs a step twice');
  A.report();
})().catch(e => { console.log('FAIL: ' + (e && e.stack || e)); process.exit(1); });
