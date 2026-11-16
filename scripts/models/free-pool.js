#!/usr/bin/env node
'use strict';
// Checks the free model pool in registry/models.json against today's sources. Read-only: it reports, it never edits
// the registry (a person or Instinct writes the change, so a bad list can't silently reroute work).
//   - provider health and free-model counts: status.json from github.com/open-free-llm-api/awesome-freellm-apis
//   - OpenRouter ids: OpenRouter's public model list (free models end in ":free" and cost 0)
// Usage: node scripts/models/free-pool.js            (live)
//        node scripts/models/free-pool.js --offline STATUS.json OPENROUTER.json   (from saved files)
const fs = require('fs');
const path = require('path');

const STATUS_URL = 'https://raw.githubusercontent.com/open-free-llm-api/awesome-freellm-apis/main/status.json';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/models';
// Names in status.json for the sidecar provider ids the pool uses.
const STATUS_NAME = { openrouter: 'OpenRouter', groq: 'Groq', gemini: 'Google Gemini', mistral: 'Mistral AI', cerebras: 'Cerebras' };

function check(registry, status, openrouter) {
  const rows = [];
  const providers = new Map(((status && status.providers) || []).map(p => [p.provider, p]));
  const orFree = new Set(((openrouter && openrouter.data) || [])
    .filter(m => /:free$/.test(m.id) || (m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0))
    .map(m => m.id));
  for (const c of (registry.free_pool && registry.free_pool.candidates) || []) {
    const p = providers.get(STATUS_NAME[c.provider]);
    const health = p ? p.status : 'not listed';
    let model = 'not checked (only OpenRouter ids are checked live)';
    if (c.provider === 'openrouter' && openrouter) model = orFree.has(c.model) ? 'free on OpenRouter' : 'NOT FOUND as a free OpenRouter model';
    rows.push({ provider: c.provider, model: c.model, health, model_check: model, ok: health === 'Operational' && !/NOT FOUND/.test(model) });
  }
  const suggestions = [...orFree].filter(id => /:free$/.test(id)).sort().slice(0, 15);
  return { rows, ok: rows.every(r => r.ok), openrouter_free_count: orFree.size, openrouter_free_sample: suggestions };
}

async function main(argv) {
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'registry', 'models.json'), 'utf8'));
  let status, openrouter;
  if (argv[0] === '--offline') {
    status = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
    openrouter = argv[2] ? JSON.parse(fs.readFileSync(argv[2], 'utf8')) : null;
  } else {
    const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); return r.ok ? r.json() : null; } catch { return null; } };
    [status, openrouter] = await Promise.all([get(STATUS_URL), get(OPENROUTER_URL)]);
    if (!status) console.log('could not read ' + STATUS_URL);
    if (!openrouter) console.log('could not read ' + OPENROUTER_URL);
  }
  const out = check(registry, status, openrouter);
  for (const r of out.rows) console.log((r.ok ? 'OK   ' : 'CHECK') + '  ' + r.provider.padEnd(11) + r.model.padEnd(42) + r.health + '; ' + r.model_check);
  if (openrouter) console.log('\nOpenRouter lists ' + out.openrouter_free_count + ' free models. Some ":free" ids: ' + out.openrouter_free_sample.join(', '));
  process.exitCode = out.ok ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { check };
