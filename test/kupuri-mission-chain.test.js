'use strict';

const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadPolicy } = require('../sidecar/governance/tenant-policy.js');
const { runKupuriMission, readKupuriMission } = require('../sidecar/governance/kupuri-mission.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'starnet-kupuri-mission-'));
const policy = loadPolicy();

function envelope(overrides = {}) {
  return {
    missionId: 'mission-proof-001',
    tenantId: 'kupuri',
    requestedBy: 'human',
    orchestrator: 'hermes',
    interface: 'alex',
    worker: 'fanni',
    capability: 'social.prepare',
    channel: 'social-draft',
    payload: { content: 'Prepare this draft. Do not publish it.' },
    ...overrides
  };
}

try {
  const first = runKupuriMission(envelope(), {
    rootDir: root,
    policy,
    now: '2026-09-18T19:00:00.000Z'
  });

  A.ok(first.ok, 'valid Kupuri mission completes the bounded chain');
  A.eq(first.replay, false, 'first mission is not a replay');
  A.eq(first.mission.status, 'AWAITING_HUMAN_APPROVAL', 'mission stops at human approval');
  A.eq(first.mission.route.agent, 'hermes', 'Hermes routed the mission');
  A.eq(first.mission.presentation.agent, 'alex', 'Alex presented the mission state');
  A.eq(first.mission.presentation.directInfrastructureAccess, false, 'Alex remains interface-only');
  A.eq(first.prepareReceipt.preparedBy, 'fanni', 'Fanni prepared the candidate');
  A.eq(first.prepareReceipt.publishExecuted, false, 'Fanni did not publish');
  A.eq(first.approval.status, 'PENDING_HUMAN_APPROVAL', 'approval queue item is pending');
  A.eq(first.approval.publishExecuted, false, 'approval queue does not execute publication');

  const disk = readKupuriMission(root, first.mission.missionId);
  A.ok(disk.mission && disk.approval, 'mission and approval survive a fresh read from disk');
  A.eq(disk.mission.prepareReceiptId, disk.approval.prepareReceiptId, 'mission and approval share prepare receipt lineage');

  const replay = runKupuriMission(envelope(), {
    rootDir: root,
    policy,
    now: '2026-09-18T19:05:00.000Z'
  });
  A.ok(replay.ok && replay.replay, 'duplicate mission replays durable state instead of duplicating work');
  A.eq(replay.mission.prepareReceiptId, first.mission.prepareReceiptId, 'duplicate mission preserves original receipt');

  const conflict = runKupuriMission(envelope({ payload: { content: 'Different body with same mission ID.' } }), {
    rootDir: root,
    policy
  });
  A.eq(conflict.ok, false, 'same mission ID with different input fails');
  A.eq(conflict.reason, 'mission-id-conflict', 'conflict is explicit');

  const wrongTenant = runKupuriMission(envelope({ missionId: 'mission-wrong-tenant', tenantId: 'shared-platform' }), {
    rootDir: root,
    policy
  });
  A.eq(wrongTenant.ok, false, 'wrong tenant fails closed');

  const bypass = runKupuriMission(envelope({ missionId: 'mission-bypass', orchestrator: 'alex' }), {
    rootDir: root,
    policy
  });
  A.eq(bypass.ok, false, 'Alex cannot replace Hermes as orchestrator');

  const receipts = fs.readdirSync(path.join(root, 'receipts'));
  A.eq(receipts.length, 1, 'duplicate mission creates only one PREPARE receipt');
  const receiptText = fs.readFileSync(path.join(root, 'receipts', receipts[0]), 'utf8');
  A.ok(!receiptText.includes('Prepare this draft'), 'durable receipt does not persist draft content');

  A.report('kupuri-mission-chain.test');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
