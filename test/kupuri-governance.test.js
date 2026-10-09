'use strict';

const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  loadPolicy,
  authorize,
  prepareSocialCandidate,
  approvePreparedCandidate
} = require('../sidecar/governance/tenant-policy.js');

const policy = loadPolicy();
const receiptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starnet-kupuri-governance-'));

try {
  const prepared = prepareSocialCandidate({
    tenantId: 'kupuri',
    requestedBy: 'hermes',
    preparedBy: 'fanni',
    channel: 'social-draft',
    content: 'Draft only. Human approval required before publication.'
  }, { policy, receiptDir, now: '2026-09-18T00:00:00.000Z' });

  A.ok(prepared.ok, 'Hermes -> Fanni PREPARE is allowed for Kupuri');
  A.ok(fs.existsSync(prepared.file), 'PREPARE writes a durable receipt');
  A.eq(prepared.receipt.status, 'PREPARED', 'receipt is PREPARED');
  A.eq(prepared.receipt.publishExecuted, false, 'PREPARE never publishes');
  A.ok(!fs.readFileSync(prepared.file, 'utf8').includes('Draft only'), 'receipt stores content hash, not draft body');

  const crossTenant = authorize({ tenantId: 'shared-platform', actorId: 'fanni', capabilityId: 'social.prepare' }, policy);
  A.eq(crossTenant.allowed, false, 'Fanni cannot cross tenant boundary');

  const avatarBypass = authorize({ tenantId: 'kupuri', actorId: 'alex', capabilityId: 'github.read' }, policy);
  A.eq(avatarBypass.allowed, false, 'Alex cannot directly exercise infrastructure capability');

  const noApproval = approvePreparedCandidate({ prepareReceipt: prepared.receipt, approval: null }, { receiptDir });
  A.eq(noApproval.ok, false, 'publish approval fails closed when human approval is absent');

  const approval = approvePreparedCandidate({
    prepareReceipt: prepared.receipt,
    approval: {
      type: 'human',
      tenantId: 'kupuri',
      capabilityId: 'social.publish',
      approvalId: 'proof-approval-001',
      approvedBy: 'kupuri-human-owner'
    }
  }, { receiptDir, now: '2026-09-18T00:01:00.000Z' });

  A.ok(approval.ok, 'valid human approval can be receipted');
  A.eq(approval.receipt.status, 'APPROVED_NOT_EXECUTED', 'approval is recorded without executing publication');
  A.eq(approval.receipt.publishExecuted, false, 'approval receipt proves no publish occurred');
  A.ok(fs.existsSync(approval.file), 'approval writes a second durable receipt');

  const directPublish = authorize({
    tenantId: 'kupuri',
    actorId: 'fanni',
    capabilityId: 'social.publish',
    approval: {
      type: 'human',
      tenantId: 'kupuri',
      capabilityId: 'social.publish',
      approvalId: 'proof-approval-001'
    }
  }, policy);
  A.eq(directPublish.allowed, false, 'first vertical slice still hard-denies live publishing even with approval');

  A.report('kupuri-governance.test');
} finally {
  fs.rmSync(receiptDir, { recursive: true, force: true });
}
