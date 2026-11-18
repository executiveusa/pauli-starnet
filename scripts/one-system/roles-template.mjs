#!/usr/bin/env node
// one-system 08: build the FACTORY_ROLES template from the district rosters, or check a filled-in one.
//   node scripts/one-system/roles-template.mjs              print a template for every READY/LIVE agent
//   node scripts/one-system/roles-template.mjs --check FILE  report agents missing from FILE (exit 1 if any)
// Paperclip agent ids and per-agent keys are filled in on the server; this file never holds a secret.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { loadCity } = require('../../gateway/factory/districts.js');

const ROLE_KEY = { 'pi-foundry': 'pi', 'qa-judge': 'qa' };
const external = new Set(['instinct']);
const want = [];
for (const d of loadCity()) for (const c of d.citizens) {
  if (!['READY', 'LIVE'].includes(c.status) || external.has(c.id)) continue;
  want.push({ key: ROLE_KEY[c.id] || c.id, district: d.id, lane: c.model_lane || 'deepseek-default' });
}

const i = process.argv.indexOf('--check');
if (i > 0) {
  const roles = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const missing = want.filter(w => !roles[w.key] || !roles[w.key].agentId || /^REPLACE/.test(roles[w.key].agentId));
  for (const m of missing) console.log('MISSING  ' + m.key + ' (' + m.district + ')');
  console.log((missing.length ? 'FAIL' : 'PASS') + ': ' + (want.length - missing.length) + '/' + want.length + ' ready agents registered');
  process.exit(missing.length ? 1 : 0);
}
const out = {};
for (const w of want) out[w.key] = { agentId: 'REPLACE_WITH_PAPERCLIP_AGENT_ID', apiKey: 'set on the server, never in git', district: w.district, lane: w.lane,
  executor: w.key === 'heisenberg' ? undefined : { type: 'sidecar', agentId: w.key, model: 'set from registry/models.json' } };
console.log(JSON.stringify(out, null, 2));
