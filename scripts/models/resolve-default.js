#!/usr/bin/env node
/* scripts/models/resolve-default.js - resolve the city's default model: the newest DeepSeek on OpenRouter.
   Reads the PUBLIC model listing (no key), writes gateway/data/model-default.json. Run on the VPS on a timer (e.g. hourly)
   so the default follows new DeepSeek releases. Usage: node scripts/models/resolve-default.js [--listing file.json] */
'use strict';
const fs = require('fs');
const path = require('path');
const { pickNewestDeepSeek, LISTING_URL } = require('../../gateway/models.js');

async function main() {
  const i = process.argv.indexOf('--listing');
  const listing = i > 0 ? JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8')) : await (await fetch(LISTING_URL)).json();
  const pick = pickNewestDeepSeek(listing);
  if (!pick) { console.error('no DeepSeek model in the listing: default left unchanged'); process.exit(1); }
  const out = process.env.STARNET_MODEL_DEFAULT_FILE || path.join(__dirname, '..', '..', 'gateway', 'data', 'model-default.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ ...pick, resolved_at: new Date().toISOString() }, null, 2) + '\n');
  console.log(JSON.stringify(pick));
}
main().catch(e => { console.error('resolve failed: ' + e.message + ' (default left unchanged)'); process.exit(1); });
