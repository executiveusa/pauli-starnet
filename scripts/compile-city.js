'use strict';
/* Compile the canonical 9-district CitySpec (frontend/app/cityos.js) into a station document
 * for the live workspace save. Usage: node scripts/compile-city.js [out.json] */
const path = require('path');
const APP = p => require(path.join(__dirname, '..', 'frontend', 'app', p));
const WM = APP('worldmodel.js');
const PS = APP('propsprites.js');
global.WorldModel = WM; global.PropSprites = PS; global.Pipeline = APP('pipeline.js'); global.window = {};
const CityOS = APP('cityos.js');
WM.setPropRules(t => { const s = PS.spec(t); return s ? { mount: s.mount || null, stack: !!s.stack, surface: !!s.surface, flat: !!s.flat } : null; });
const roster = [
  { id: 'agent', name: 'HEISENBERG', role: 'orchestrator', specialtyId: 'orchestrator' },
  { id: 'ecom-merci', name: 'MERCI', role: 'operator', specialtyId: 'operator' },
  { id: 'ecom-beacon', name: 'BEACON', role: 'optimizer', specialtyId: 'optimizer' },
  { id: 'ecom-herald', name: 'HERALD', role: 'publisher', specialtyId: 'publisher' },
  { id: 'ecom-ledger', name: 'LEDGER', role: 'treasurer', specialtyId: 'treasurer' },
  { id: 'ecom-conduit', name: 'CONDUIT', role: 'operator', specialtyId: 'operator' }
];
const station = WM.create();
const ws = station.ensureWorkstation('agent');
if (!ws.ok) { console.error('workstation failed', ws); process.exit(1); }
const plan = CityOS.plan(station, null, { roster });
if (!plan.ok) { console.error('PLAN FAILED', JSON.stringify(plan).slice(0, 1200)); process.exit(1); }
require('fs').writeFileSync(process.argv[2] || '/tmp/city-station.json', JSON.stringify(plan.document, null, 1));
console.log(JSON.stringify({ ok: plan.ok, name: plan.name, summary: plan.summary, vacancies: plan.vacancies.length,
  rooms: Object.keys(plan.document.rooms).length, props: plan.document.props.length }, null, 1));
