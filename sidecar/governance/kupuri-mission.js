'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  loadPolicy,
  authorize,
  prepareSocialCandidate
} = require('./tenant-policy.js');

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = canonical(value[key]);
      return out;
    }, {});
  }
  return value;
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function missionPaths(root, missionId) {
  const id = safeId(missionId);
  return {
    mission: path.join(root, 'missions', id + '.json'),
    approval: path.join(root, 'approvals', id + '.json'),
    receipts: path.join(root, 'receipts')
  };
}

function defaultAdapters() {
  return {
    hermes: {
      transport: 'contract',
      route(envelope) {
        return {
          agent: 'hermes',
          status: 'ROUTED',
          missionId: envelope.missionId,
          tenantId: envelope.tenantId,
          capability: envelope.capability,
          worker: envelope.worker
        };
      }
    },
    alex: {
      transport: 'contract',
      present(envelope) {
        return {
          agent: 'alex',
          status: 'PRESENTED',
          missionId: envelope.missionId,
          tenantId: envelope.tenantId,
          ownerFacing: true,
          directInfrastructureAccess: false
        };
      }
    },
    fanni: {
      transport: 'contract',
      prepare(envelope, options) {
        return prepareSocialCandidate({
          tenantId: envelope.tenantId,
          requestedBy: 'hermes',
          preparedBy: 'fanni',
          channel: envelope.channel,
          content: envelope.payload.content
        }, options);
      }
    }
  };
}

function validateEnvelope(envelope) {
  const required = ['missionId', 'tenantId', 'requestedBy', 'orchestrator', 'interface', 'worker', 'capability', 'channel', 'payload'];
  for (const key of required) {
    if (!envelope || envelope[key] === undefined || envelope[key] === null) {
      return { ok: false, reason: 'missing-' + key };
    }
  }
  if (envelope.requestedBy !== 'human') return { ok: false, reason: 'requester-must-be-human' };
  if (envelope.orchestrator !== 'hermes') return { ok: false, reason: 'orchestrator-must-be-hermes' };
  if (envelope.interface !== 'alex') return { ok: false, reason: 'interface-must-be-alex' };
  if (envelope.worker !== 'fanni') return { ok: false, reason: 'worker-must-be-fanni' };
  if (envelope.capability !== 'social.prepare') return { ok: false, reason: 'capability-outside-slice' };
  if (!envelope.payload || typeof envelope.payload.content !== 'string' || !envelope.payload.content.trim()) {
    return { ok: false, reason: 'missing-content' };
  }
  return { ok: true };
}

function runKupuriMission(envelope, options = {}) {
  const valid = validateEnvelope(envelope);
  if (!valid.ok) return { ok: false, stage: 'validate', reason: valid.reason };

  const root = options.rootDir;
  if (!root) return { ok: false, stage: 'validate', reason: 'missing-rootDir' };

  const policy = options.policy || loadPolicy(options.policyPath);
  const adapters = options.adapters || defaultAdapters();
  const paths = missionPaths(root, envelope.missionId);
  const inputHash = hash(envelope);

  if (fs.existsSync(paths.mission)) {
    const prior = readJson(paths.mission);
    if (prior.inputHash !== inputHash) {
      return { ok: false, stage: 'idempotency', reason: 'mission-id-conflict', mission: prior };
    }
    return { ok: true, replay: true, mission: prior, approval: fs.existsSync(paths.approval) ? readJson(paths.approval) : null };
  }

  const routeAuth = authorize({ tenantId: envelope.tenantId, actorId: 'hermes', capabilityId: 'mission.route' }, policy);
  if (!routeAuth.allowed) return { ok: false, stage: 'hermes-authorize', authorization: routeAuth };

  const alexAuth = authorize({ tenantId: envelope.tenantId, actorId: 'alex', capabilityId: 'mission.request' }, policy);
  if (!alexAuth.allowed) return { ok: false, stage: 'alex-authorize', authorization: alexAuth };

  const route = adapters.hermes.route(envelope);
  if (!route || route.status !== 'ROUTED' || route.missionId !== envelope.missionId) {
    return { ok: false, stage: 'hermes-route', reason: 'invalid-hermes-route-result' };
  }

  const presentation = adapters.alex.present(envelope);
  if (!presentation || presentation.status !== 'PRESENTED' || presentation.directInfrastructureAccess !== false) {
    return { ok: false, stage: 'alex-present', reason: 'invalid-alex-presentation-result' };
  }

  const prepared = adapters.fanni.prepare(envelope, {
    policy,
    receiptDir: paths.receipts,
    now: options.now
  });
  if (!prepared || !prepared.ok) {
    return { ok: false, stage: 'fanni-prepare', detail: prepared || null };
  }

  const now = options.now || new Date().toISOString();
  const mission = {
    version: 1,
    missionId: envelope.missionId,
    inputHash,
    tenantId: envelope.tenantId,
    requestedBy: envelope.requestedBy,
    orchestrator: 'hermes',
    interface: 'alex',
    worker: 'fanni',
    capability: 'social.prepare',
    status: 'AWAITING_HUMAN_APPROVAL',
    route,
    presentation,
    prepareReceiptId: prepared.receipt.receiptId,
    publishExecuted: false,
    createdAt: now,
    updatedAt: now
  };

  const approval = {
    version: 1,
    queueId: 'approval-' + hash({ missionId: envelope.missionId, prepareReceiptId: prepared.receipt.receiptId }).slice(0, 16),
    missionId: envelope.missionId,
    tenantId: envelope.tenantId,
    prepareReceiptId: prepared.receipt.receiptId,
    requestedCapability: 'social.publish',
    status: 'PENDING_HUMAN_APPROVAL',
    publishExecuted: false,
    createdAt: now
  };

  atomicWriteJson(paths.mission, mission);
  atomicWriteJson(paths.approval, approval);

  return { ok: true, replay: false, mission, approval, prepareReceipt: prepared.receipt };
}

function readKupuriMission(rootDir, missionId) {
  const paths = missionPaths(rootDir, missionId);
  return {
    mission: fs.existsSync(paths.mission) ? readJson(paths.mission) : null,
    approval: fs.existsSync(paths.approval) ? readJson(paths.approval) : null
  };
}

module.exports = {
  defaultAdapters,
  validateEnvelope,
  runKupuriMission,
  readKupuriMission
};
