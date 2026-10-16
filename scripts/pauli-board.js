#!/usr/bin/env node
/* scripts/pauli-board.js - the live caller for council board mode.

   Convenes a board of advisors on one proposal: persona seats (each with a brain folder) speak in
   order on free-first models, the chair locks a scored recommendation. The estimate prints BEFORE
   anything runs and the run only proceeds with --yes (the owner approves the estimate, never a
   blank check). Deny-by-default ASTRA gate: a mission-bound grant (--mission/--budget/--grant-model)
   is required. Free models price at $0 through the price table like everything else.

   Usage:
     OPENROUTER_API_KEY=... node scripts/pauli-board.js \
       --proposal "launch X" --board districts/pauli/board/manifest.example.json \
       --mission msn-1 --budget 0.10 --grant-model <chair-or-seat-model> --yes

   The manifest: { "chairModel": "id", "seats": [{ "id", "model", "weight", "brain": "seats/x.md" }] }
   Swap any model at call time: --set hormozi=other/model:free --set chair=other/model:free (repeatable).
   Brains load relative to the manifest. --prices overrides the free-first price table. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliCouncil } = require('../sidecar/pauli-council.js');
const { makePauliCouncilRunner } = require('../sidecar/pauli-council-runner.js');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const has = name => process.argv.includes('--' + name);
function argAll(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === '--' + name && process.argv[i + 1]) out.push(process.argv[i + 1]);
  return out;
}

const proposal = arg('proposal', null);
const manifestPath = arg('board', null);
const missionId = arg('mission', null);
const budgetUSD = parseFloat(arg('budget', 'NaN'));
const grantModel = arg('grant-model', null);
const grantTtlMin = parseInt(arg('grant-ttl-min', '60'), 10);
const repoRoot = path.join(__dirname, '..');
const pricesPath = arg('prices', path.join(repoRoot, 'districts', 'pauli', 'board', 'prices.free.json'));

if (!proposal || !manifestPath || !missionId || !grantModel || Number.isNaN(budgetUSD)) {
  console.error('required: --proposal --board --mission --budget --grant-model [--yes] [--prices] [--grant-ttl-min]');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const modelOverrides = {};
for (const pair of argAll('set')) { // --set hormozi=qwen/qwen-2.5-72b-instruct:free - repeatable; 'chair' swaps the chair model
  const eq = pair.indexOf('=');
  if (eq < 1) { console.error('--set needs seat=model (got: ' + pair + ')'); process.exit(2); }
  modelOverrides[pair.slice(0, eq)] = pair.slice(eq + 1);
}
const manifestDir = path.dirname(manifestPath);
const prices = JSON.parse(fs.readFileSync(pricesPath, 'utf8'));
const seatInstructions = {};
for (const s of manifest.seats) {
  if (s.brain) seatInstructions[s.id] = fs.readFileSync(path.join(manifestDir, s.brain), 'utf8');
}

const apiKey = process.env.OPENROUTER_API_KEY;
async function callModel({ model, prompt }) {
  if (!apiKey) return { text: '' }; // runner turns this into a clean worker-failed
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) return { text: '' };
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message ? String(data.choices[0].message.content || '') : '';
  const cost = data && data.usage && typeof data.usage.cost === 'number' ? data.usage.cost : 0;
  return { text, usage: { costUSD: cost } };
}

(async () => {
  const council = makePauliCouncil({ fs, pathMod: path, root: repoRoot, clock: Date.now, idgen: () => crypto.randomUUID().slice(0, 8), crypto });
  const runner = makePauliCouncilRunner({ council, callModel, prices, fs, pathMod: path, root: repoRoot, clock: Date.now, idgen: () => crypto.randomUUID().slice(0, 8), crypto });
  const roomId = council.openRoom({ participants: manifest.seats.map(s => ({ id: s.id, model: s.model })).concat([{ id: 'chair', model: manifest.chairModel }]) }).roomId;

  if (Object.keys(modelOverrides).length) {
    const applied = runner.applyModelOverrides(manifest, modelOverrides);
    if (!applied.ok) { console.error('model override refused:', JSON.stringify(applied)); process.exit(1); }
    manifest.seats = applied.manifest.seats; manifest.chairModel = applied.manifest.chairModel;
  }
  console.log('BOARD LINEUP (seat -> model):');
  for (const s of manifest.seats) console.log('  ' + s.id + ' -> ' + s.model);
  console.log('  chair -> ' + manifest.chairModel);
  const est = runner.estimateBoard({ proposal, seats: manifest.seats, chairModel: manifest.chairModel });
  if (!est.ok) { console.error('estimate refused:', JSON.stringify(est)); process.exit(1); }
  console.log('ESTIMATE (approve this before anything runs):');
  console.log(JSON.stringify(est.estimate, null, 2));
  if (!has('yes')) { console.log('\nDry run only. Re-run with --yes to execute against this estimate.'); process.exit(0); }

  const grant = { missionId, provider: 'openrouter', model: grantModel, expiresAt: Date.now() + grantTtlMin * 60000, budgetUSD };
  const ran = await runner.runBoard({ roomId, proposal, seats: manifest.seats, chairModel: manifest.chairModel, grant, seatInstructions, boardDir: manifestDir });
  if (!ran.ok) { console.error('run refused/failed:', JSON.stringify(ran)); process.exit(1); }
  const closed = council.close(roomId);
  console.log('\nRESULT:');
  console.log(JSON.stringify({ debateId: ran.result.debateId, escalated: ran.result.escalated, models: ran.result.receipt.models, locked: ran.result.locked, usage: ran.result.usage, receiptHash: ran.result.receipt.receiptHash, minutesHash: closed.ok ? closed.receipt.receiptHash : null }, null, 2));
})().catch(e => { console.error('fatal:', e && e.message ? e.message : String(e)); process.exit(1); });
