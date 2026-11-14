#!/usr/bin/env node
'use strict';
// Generate registry/districts.json from the CitySpec (the one list of districts) plus registry/district-lanes.json
// (how each district works) and knowledge/sources.json (what each district knows).
//   node scripts/city/build-registry.js          # write registry/districts.json
//   node scripts/city/build-registry.js --check  # exit 1 when the committed file is stale
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function buildRegistry() {
  const City = require(path.join(ROOT, 'frontend', 'app', 'cityos.js'));
  const lanesDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'district-lanes.json'), 'utf8'));
  const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'sources.json'), 'utf8')).sources;
  const d = lanesDoc.meta.defaults;
  const ids = City.DEFAULT_SPEC.districts.map(x => x.id);

  for (const id of Object.keys(lanesDoc.lanes)) if (!ids.includes(id)) throw new Error('district-lanes.json names a district the CitySpec does not have: ' + id);
  for (const [from, to] of Object.entries(lanesDoc.aliases)) if (!ids.includes(to)) throw new Error('alias ' + from + ' points at unknown district ' + to);

  const districts = City.DEFAULT_SPEC.districts.map(x => {
    const lane = lanesDoc.lanes[x.id];
    if (!lane) throw new Error('district ' + x.id + ' has no lane in registry/district-lanes.json');
    return {
      id: x.id,
      label: x.label,
      buildings: x.buildings.map(b => (City.BUILDING_TEMPLATES[b.template] || {}).label || b.template),
      foreman: 'heisenberg',
      active: !!lane.active,
      purpose: lane.purpose,
      queue: { repo: lane.queue_repo, label: 'district:' + x.id, approve_label: 'approved', blocked_label: 'blocked' },
      daily_usd_cap: lane.daily_usd_cap ?? d.daily_usd_cap,
      max_attempts: lane.max_attempts ?? d.max_attempts,
      unattended_permissions: lane.unattended_permissions || d.unattended_permissions,
      knowledge: sources.filter(s => s.routes.some(r => r.district === x.id)).map(s => s.id),
      aliases: Object.entries(lanesDoc.aliases).filter(([, to]) => to === x.id).map(([from]) => from)
    };
  });
  return { generated: 'by scripts/city/build-registry.js from frontend/app/cityos.js + registry/district-lanes.json + knowledge/sources.json; do not edit', districts };
}

function render(reg) { return JSON.stringify(reg, null, 2) + '\n'; }

if (require.main === module) {
  const file = path.join(ROOT, 'registry', 'districts.json');
  const out = render(buildRegistry());
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (cur !== out) { console.error('registry/districts.json is stale: run node scripts/city/build-registry.js'); process.exit(1); }
    console.log('registry/districts.json is current');
  } else {
    fs.writeFileSync(file, out);
    console.log('wrote registry/districts.json');
  }
}

module.exports = { buildRegistry, render };
