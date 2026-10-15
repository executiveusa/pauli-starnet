'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = path.resolve(__dirname, '..', '..', 'registry', 'policy.v1.json');

function loadPolicy(policyPath = DEFAULT_POLICY) {
  return JSON.parse(fs.readFileSync(policyPath, 'utf8'));
}

function denied(reason, details = {}) {
  return { allowed: false, reason, ...details };
}

function authorize(input, policy = loadPolicy()) {
  const { tenantId, actorId, capabilityId, approval } = input || {};
  const tenant = policy.tenants && policy.tenants[tenantId];
  const actor = policy.agents && policy.agents[actorId];
  const capability = policy.capabilities && policy.capabilities[capabilityId];

  if (!tenant) return denied('unknown-tenant');
  if (!actor) return denied('unknown-actor');
  if (!capability) return denied('unknown-capability');

  if (actor.tenant_scope !== 'shared' && actor.tenant_scope !== 'configurable' && actor.tenant_scope !== tenantId) {
    return denied('cross-tenant-actor');
  }

  for (const rule of policy.hard_denies || []) {
    if (rule.actor && rule.actor !== actorId) continue;
    if (rule.capability && rule.capability !== capabilityId) continue;
    if (rule.when === 'infrastructure' && !capability.infrastructure) continue;
    return denied('hard-deny', { policyReason: rule.reason });
  }

  const grants = ((tenant.agents || {})[actorId]) || [];
  if (!grants.includes(capabilityId)) return denied('capability-not-granted');

  if (capability.approval === 'human') {
    if (!approval || approval.type !== 'human' || approval.tenantId !== tenantId || approval.capabilityId !== capabilityId || !approval.approvalId) {
      return denied('human-approval-required');
    }
  }
  if (capability.approval === 'mission-scope') {
    if (!approval || approval.type !== 'mission-scope' || approval.tenantId !== tenantId || !approval.approvalId) {
      return denied('mission-scope-approval-required');
    }
  }

  return { allowed: true, reason: 'authorized', tenantId, actorId, capabilityId };
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function writeReceipt(receiptDir, receipt) {
  fs.mkdirSync(receiptDir, { recursive: true });
  const file = path.join(receiptDir, receipt.receiptId + '.json');
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
  return file;
}

function prepareSocialCandidate(input, options = {}) {
  const policy = options.policy || loadPolicy(options.policyPath);
  const route = authorize({ tenantId: input.tenantId, actorId: input.requestedBy, capabilityId: 'mission.route' }, policy);
  if (!route.allowed) return { ok: false, stage: 'route', authorization: route };

  const prep = authorize({ tenantId: input.tenantId, actorId: input.preparedBy, capabilityId: 'social.prepare' }, policy);
  if (!prep.allowed) return { ok: false, stage: 'prepare', authorization: prep };

  const now = options.now || new Date().toISOString();
  const contentHash = stableHash({ channel: input.channel, content: input.content });
  const receipt = {
    receiptId: 'prep-' + contentHash.slice(0, 16),
    version: 1,
    tenantId: input.tenantId,
    requestedBy: input.requestedBy,
    preparedBy: input.preparedBy,
    capability: 'social.prepare',
    channel: input.channel,
    contentHash,
    status: 'PREPARED',
    publishExecuted: false,
    nextRequiredCapability: 'social.publish',
    nextRequiredApproval: 'human',
    createdAt: now
  };
  const file = writeReceipt(options.receiptDir, receipt);
  return { ok: true, receipt, file };
}

function approvePreparedCandidate(input, options = {}) {
  if (!input || !input.prepareReceipt || input.prepareReceipt.status !== 'PREPARED') {
    return { ok: false, stage: 'approval', authorization: denied('invalid-prepare-receipt') };
  }
  const approval = input.approval || {};
  const receipt = input.prepareReceipt;
  if (approval.type !== 'human' || approval.tenantId !== receipt.tenantId || approval.capabilityId !== 'social.publish' || !approval.approvalId) {
    return { ok: false, stage: 'approval', authorization: denied('human-approval-required') };
  }

  const now = options.now || new Date().toISOString();
  const approvalReceipt = {
    receiptId: 'approval-' + stableHash({ prepareReceiptId: receipt.receiptId, approvalId: approval.approvalId }).slice(0, 16),
    version: 1,
    tenantId: receipt.tenantId,
    prepareReceiptId: receipt.receiptId,
    capability: 'social.publish',
    approvalId: approval.approvalId,
    approvedBy: approval.approvedBy || 'human-owner',
    status: 'APPROVED_NOT_EXECUTED',
    publishExecuted: false,
    createdAt: now
  };
  const file = writeReceipt(options.receiptDir, approvalReceipt);
  return { ok: true, receipt: approvalReceipt, file };
}

module.exports = { loadPolicy, authorize, prepareSocialCandidate, approvePreparedCandidate, writeReceipt };
