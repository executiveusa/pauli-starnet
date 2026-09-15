#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  exportPublicHealth,
  captureGetReceipt,
  validateReceipt,
  run
} = require('../../sidecar/pauli-icm-architect');

const HEALTH_URL = 'https://api.thepaulieffect.com/terabithia/health';
const PROBES = [
  ['protected-system-status', 'https://api.thepaulieffect.com/terabithia/api/v1/system/status'],
  ['protected-fleet-missions', 'https://api.thepaulieffect.com/terabithia/api/v1/fleet/missions']
];

function sha256File(file) {
  return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
}

async function main() {
  const out = path.resolve(process.argv[2] || process.env.PAULI_ICM_OUT || 'pauli-icm-live-out');
  if (fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
  const source = path.join(out, '00_source');
  fs.mkdirSync(source, { recursive: true });

  const event = await exportPublicHealth(HEALTH_URL, source);
  for (const [name, url] of PROBES) {
    const { record } = await captureGetReceipt(url, source, name);
    if (record.status !== 401) throw new Error(`${name} boundary changed: expected HTTP 401, got ${record.status}`);
    validateReceipt(source, name);
  }
  validateReceipt(source, 'health');

  const pipeline = path.join(out, 'pipeline');
  const result = run([event], pipeline, {
    mode: 'live-read-only',
    receiptRoot: source,
    generated_at: event.observed_at
  });
  const receipt = {
    schema_version: 1,
    role: 'pauli-icm-architect',
    mode: 'live-read-only',
    cost_usd: 0,
    observed_at: event.observed_at,
    source: HEALTH_URL,
    event_id: event.event_id,
    event_verification_level: result.verified.events[0].verification_level,
    event_verified: result.verified.events[0].verified,
    protected_boundaries: PROBES.map(([name, url]) => ({ name, url, expected_status: 401, observed_status: 401 })),
    finding_count: result.proposals.findings.length,
    findings: result.proposals.findings.map(f => ({ id: f.id, severity: f.severity, approval_required: f.approval_required })),
    output_hashes: {
      verified: sha256File(path.join(pipeline, '02_verify/output/verified.json')),
      proposals: sha256File(path.join(pipeline, '04_propose/output/proposals.json')),
      brief: sha256File(path.join(pipeline, '05_report/output/brief.json'))
    },
    trust_limit: 'Receipt-bound means byte-consistent runner capture, not cryptographic proof of external origin.',
    coverage_limit: 'Only public Terabithia health is observed. Protected watcher, mission, result, and evaluation events remain unavailable without a server-owned sanitized export.',
    effect_limit: 'This run observes and proposes only. It performs no source, mission, fleet, policy, deployment, credential, payment, or communication mutation.'
  };
  fs.writeFileSync(path.join(out, 'activation-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');

  const summary = [
    '# Pauli ICM live watch',
    '',
    `- Observed: ${receipt.observed_at}`,
    `- Verification: ${receipt.event_verification_level} (verified: ${receipt.event_verified})`,
    `- Findings proposed: ${receipt.finding_count}`,
    `- Protected boundaries: ${receipt.protected_boundaries.length} returned HTTP 401 as expected`,
    `- Cost: $${receipt.cost_usd}`,
    '',
    '## Coverage limit',
    receipt.coverage_limit,
    '',
    '## Trust limit',
    receipt.trust_limit,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(out, 'SUMMARY.md'), summary);
  process.stdout.write(summary);
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
