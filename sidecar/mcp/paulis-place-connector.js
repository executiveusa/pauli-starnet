/* sidecar/mcp/paulis-place-connector.js
 * Pauli STARNET — Pauli's Place MCP connector.
 * Exposes read tools from the Pauli's Place backend to Heisenberg and crew.
 * Write tools are all consent-gated (requiresConsent: true).
 *
 * Pauli's Place backend: Python FastAPI at $PAULIS_PLACE_URL (localhost or Tailscale host).
 * Source: https://github.com/executiveusa/PAULIS-PLACE
 *
 * SECURITY:
 *  - Internal connector only — never exposed to public network.
 *  - No auth tokens in tool results or event payloads.
 *  - All write tools require consent.
 */
'use strict';

const BASE_URL = process.env.PAULIS_PLACE_URL || 'http://localhost:8000';

async function apiFetch(path, opts) {
  opts = opts || {};
  const url = BASE_URL + path;
  const headers = Object.assign({ 'Content-Type': 'application/json', 'User-Agent': 'PAULI-STARNET/1.0' }, opts.headers || {});
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Pauli\'s Place API ' + res.status + ' at ' + path + ': ' + body.slice(0, 200));
  }
  return res.json();
}

// ─── HEALTH (read-only) ───────────────────────────────────────────────────────
async function healthCheck() {
  try {
    const data = await apiFetch('/api/health');
    return { ok: true, status: data };
  } catch (e) {
    return { ok: false, error: String(e.message || e), note: 'Is Pauli\'s Place running? Check PAULIS_PLACE_URL.' };
  }
}

// ─── AGENT STATUS (read-only) ─────────────────────────────────────────────────
async function getAgentStatus() {
  return apiFetch('/api/control-plane/status');
}

// ─── REVENUE METRICS (read-only) ──────────────────────────────────────────────
async function getRevenueMetrics(days) {
  const d = days || 7;
  return apiFetch('/api/dashboard/revenue?days=' + d);
}

// ─── BUSINESS METRICS (read-only) ─────────────────────────────────────────────
async function getBusinessMetrics() {
  return apiFetch('/api/dashboard/metrics');
}

// ─── ACTIVE GOALS (read-only) ─────────────────────────────────────────────────
async function getActiveGoals() {
  return apiFetch('/api/control-plane/goals');
}

// ─── APPROVAL QUEUE (read-only) ───────────────────────────────────────────────
async function getPendingApprovals() {
  return apiFetch('/api/approvals/pending');
}

// ─── SUBMIT APPROVAL DECISION (write — consent required) ──────────────────────
async function submitApprovalDecision(approvalId, decision, reason) {
  if (!approvalId) throw new Error('approvalId required');
  if (!['approved', 'rejected'].includes(decision)) throw new Error('decision must be approved | rejected');
  return apiFetch('/api/approvals/' + approvalId + '/decide', {
    method: 'POST',
    body: JSON.stringify({ decision, reason: reason || '' })
  });
}

// ─── POD CATALOG READ (read-only) ─────────────────────────────────────────────
async function getPODCatalog(query) {
  const q = query ? '?q=' + encodeURIComponent(query) : '';
  return apiFetch('/api/pod/catalog' + q);
}

// ─── POD QUOTE (read-only) ────────────────────────────────────────────────────
async function getPODQuote(productSpec) {
  return apiFetch('/api/pod/quote', {
    method: 'POST',
    body: JSON.stringify(productSpec || {})
  });
}

// ─── POD DRAFT (write — consent required) ─────────────────────────────────────
async function createPODDraft(draftSpec) {
  if (!draftSpec || !draftSpec.title) throw new Error('draftSpec.title required');
  return apiFetch('/api/pod/draft', {
    method: 'POST',
    body: JSON.stringify(draftSpec)
  });
}

// ─── MCP TOOL DESCRIPTOR TABLE ────────────────────────────────────────────────
// STARNET reads this to register the tools in the capability system.
const TOOLS = [
  {
    name: 'paulis_place.health',
    description: 'Check if Pauli\'s Place backend is running and healthy.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    run: healthCheck
  },
  {
    name: 'paulis_place.agent_status',
    description: 'Get the status of all agents running in Pauli\'s Place.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    run: getAgentStatus
  },
  {
    name: 'paulis_place.revenue_metrics',
    description: 'Get revenue metrics from Pauli\'s Place for the last N days.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    schema: { properties: { days: { type: 'number', description: 'Days to look back (default 7)' } } },
    run: (args) => getRevenueMetrics((args || {}).days)
  },
  {
    name: 'paulis_place.business_metrics',
    description: 'Get overall business metrics and KPIs from Pauli\'s Place.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    run: getBusinessMetrics
  },
  {
    name: 'paulis_place.active_goals',
    description: 'Get the list of active goals and their progress from Pauli\'s Place.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    run: getActiveGoals
  },
  {
    name: 'paulis_place.pending_approvals',
    description: 'Get the queue of actions pending owner approval in Pauli\'s Place.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    run: getPendingApprovals
  },
  {
    name: 'paulis_place.approval_decide',
    description: 'Submit an approval or rejection for a pending action in Pauli\'s Place. Requires owner consent.',
    capability: 'connector',
    scope: 'execute',
    requiresConsent: true,
    schema: {
      required: ['approvalId', 'decision'],
      properties: {
        approvalId: { type: 'string' },
        decision: { type: 'string', enum: ['approved', 'rejected'] },
        reason: { type: 'string' }
      }
    },
    run: (args) => submitApprovalDecision(args.approvalId, args.decision, args.reason)
  },
  {
    name: 'paulis_place.pod_catalog',
    description: 'Search the POD product catalog available in Pauli\'s Place.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    schema: { properties: { query: { type: 'string' } } },
    run: (args) => getPODCatalog((args || {}).query)
  },
  {
    name: 'paulis_place.pod_quote',
    description: 'Get a price/margin quote for a POD product spec from Pauli\'s Place.',
    capability: 'connector',
    scope: 'read',
    requiresConsent: false,
    schema: { required: ['productSpec'], properties: { productSpec: { type: 'object' } } },
    run: (args) => getPODQuote((args || {}).productSpec)
  },
  {
    name: 'paulis_place.pod_draft',
    description: 'Create a POD product draft in Pauli\'s Place. Requires owner consent. DRAFT ONLY — does not publish.',
    capability: 'connector',
    scope: 'execute',
    requiresConsent: true,
    schema: {
      required: ['draftSpec'],
      properties: {
        draftSpec: { type: 'object', description: 'Product spec including title, blueprintId, variants, prices' }
      }
    },
    run: (args) => createPODDraft((args || {}).draftSpec)
  }
];

module.exports = { TOOLS, healthCheck, getRevenueMetrics, getBusinessMetrics };
