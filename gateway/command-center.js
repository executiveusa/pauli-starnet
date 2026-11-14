/* Command Center desk: one read model for the owner's phone.
   - approvals: what is waiting for the owner (read-only; deciding stays in STARNET)
   - receipts per district: what each agent did, from the gateway's own task records
   - cost meter: tokens per mission, appended to a district ledger, one total
   - permission cards: what each agent may reach, from registry/policy.v1.json
   Truth rules: nothing is invented. No cost row means the meter says "no data", not 0 tokens spent.
   A new agent that is not in the policy starts PRIVATE (no capabilities, creator only). */
'use strict';
const fs = require('fs');
const path = require('path');

const DISTRICT_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
const ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;
const MAX_TOKENS = 50_000_000;

function cleanText(v, max) {
  return typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 120) : '';
}
function agoMin(iso, now) {
  const t = Date.parse(typeof iso === 'string' ? iso : '');
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 60000)) : null;
}

/* ── cost ledger (jsonl, append-only) ─────────────────────────────────────── */
function makeCostLedger(file) {
  function validate(e) {
    const o = e && typeof e === 'object' ? e : {};
    const mission_id = typeof o.mission_id === 'string' && ID_RE.test(o.mission_id) ? o.mission_id : null;
    const district = typeof o.district === 'string' && DISTRICT_RE.test(o.district) ? o.district.toLowerCase() : null;
    const tin = Number(o.tokens_in), tout = Number(o.tokens_out);
    const okN = n => Number.isInteger(n) && n >= 0 && n <= MAX_TOKENS;
    if (!mission_id) return { error: 'mission_id required (letters, digits, . _ : -, max 80)' };
    if (!district) return { error: 'district required (letters, digits, _ -, max 40)' };
    if (!okN(tin) || !okN(tout)) return { error: 'tokens_in and tokens_out must be whole numbers >= 0' };
    const row = { ts: new Date().toISOString(), mission_id, district, tokens_in: tin, tokens_out: tout };
    const model = cleanText(o.model, 80); if (model) row.model = model;
    const agent = typeof o.agent === 'string' && ID_RE.test(o.agent) ? o.agent : ''; if (agent) row.agent = agent;
    return { row };
  }
  function record(e) {
    const v = validate(e);
    if (v.error) return { ok: false, error: v.error };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(v.row) + '\n', { mode: 0o600 });
    return { ok: true, row: v.row };
  }
  function read() {
    let txt = '';
    try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { return []; }
    const rows = [];
    for (const line of txt.split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); if (r && r.mission_id && r.district) rows.push(r); } catch (_) { /* skip a torn line */ }
    }
    return rows;
  }
  return { record, read, validate };
}

function summarizeCosts(rows) {
  if (!rows.length) return { has_data: false, total_tokens: null, by_district: [], top_missions: [], rows: 0 };
  const byD = new Map(), byM = new Map();
  let total = 0;
  for (const r of rows) {
    const t = (r.tokens_in || 0) + (r.tokens_out || 0);
    total += t;
    const d = byD.get(r.district) || { district: r.district, tokens: 0, missions: new Set() };
    d.tokens += t; d.missions.add(r.mission_id); byD.set(r.district, d);
    const m = byM.get(r.mission_id) || { mission_id: r.mission_id, district: r.district, tokens: 0 };
    m.tokens += t; byM.set(r.mission_id, m);
  }
  return {
    has_data: true,
    total_tokens: total,
    rows: rows.length,
    by_district: [...byD.values()].map(d => ({ district: d.district, tokens: d.tokens, missions: d.missions.size })).sort((a, b) => b.tokens - a.tokens),
    top_missions: [...byM.values()].sort((a, b) => b.tokens - a.tokens).slice(0, 10)
  };
}

/* ── permission cards ─────────────────────────────────────────────────────── */
const PRIVATE_DEFAULT = Object.freeze({ tenant_scope: 'private', rooms: [], capabilities: [] });

function permissionCards(policy, rosterIds) {
  const p = policy && typeof policy === 'object' ? policy : {};
  const tenants = p.tenants || {}, agents = p.agents || {}, caps = p.capabilities || {};
  const denies = Array.isArray(p.hard_denies) ? p.hard_denies : [];
  const ids = new Set(Object.keys(agents));
  for (const id of rosterIds || []) if (typeof id === 'string' && ID_RE.test(id)) ids.add(id);
  const cards = [];
  for (const id of [...ids].sort()) {
    const known = Object.prototype.hasOwnProperty.call(agents, id);
    if (!known) {
      cards.push({ agent: id, registered: false, tenant_scope: PRIVATE_DEFAULT.tenant_scope, rooms: [], capabilities: [],
        note: 'Not in the policy yet: starts private, no capabilities. Add it to registry/policy.v1.json to grant anything.' });
      continue;
    }
    const a = agents[id] || {};
    const granted = [], rooms = [];
    for (const [tenant, t] of Object.entries(tenants)) {
      const list = t && t.agents && Array.isArray(t.agents[id]) ? t.agents[id] : null;
      if (!list) continue;
      rooms.push({ tenant, status: t.status || 'UNKNOWN' });
      for (const c of list) {
        const meta = caps[c] || {};
        const blocked = denies.find(d => (d.actor === id || !d.actor) && (d.capability === c || (d.when === 'infrastructure' && meta.infrastructure)) );
        granted.push({ capability: c, tenant, risk: meta.risk || 'unknown', approval: meta.approval || 'unknown',
          effective: !blocked, ...(blocked ? { denied_by: cleanText(blocked.reason, 160) } : {}) });
      }
    }
    cards.push({ agent: id, registered: true, tenant_scope: a.tenant_scope || 'unknown',
      direct_infrastructure_access: a.direct_infrastructure_access === true, rooms, capabilities: granted });
  }
  return cards;
}

/* ── command center read model ────────────────────────────────────────────── */
function buildCommandCenter({ approvals, tasks, costRows, policy, rosterIds, now }) {
  const t0 = typeof now === 'number' ? now : Date.now();
  const appr = (approvals || []).slice(0, 50).map(a => ({
    id: cleanText(String(a.id || ''), 80), title: cleanText(a.title, 120), district: cleanText(a.district, 40) || 'city',
    risk: ['low', 'medium', 'high', 'critical'].includes(a.risk) ? a.risk : 'medium',
    cost: typeof a.cost === 'number' && Number.isFinite(a.cost) ? a.cost : null
  }));
  const byDistrict = new Map();
  for (const t of tasks || []) {
    const ctx = t && t.context && typeof t.context === 'object' ? t.context : {};
    const district = (typeof ctx.district === 'string' && DISTRICT_RE.test(ctx.district) ? ctx.district : 'city').toLowerCase();
    const row = {
      task_id: cleanText(String(t.id || t.task_id || ''), 80),
      agent: cleanText(String(ctx.agentId || ctx.slot || t.agentId || ''), 60) || null,
      did: cleanText(t.task, 140),
      status: ['running', 'completed', 'failed', 'accepted'].includes(t.status) ? t.status : 'unknown',
      receipt_id: t.receipt && t.receipt.receipt_id ? String(t.receipt.receipt_id).slice(0, 80) : null,
      started_ago_min: agoMin(t.startedAt, t0)
    };
    if (!byDistrict.has(district)) byDistrict.set(district, []);
    byDistrict.get(district).push(row);
  }
  const receipts = [...byDistrict.entries()].map(([district, rows]) => ({
    district,
    runs: rows.length,
    with_receipt: rows.filter(r => r.receipt_id).length,
    recent: rows.slice(-8).reverse()
  })).sort((a, b) => a.district.localeCompare(b.district));
  return {
    generated_at: new Date(t0).toISOString(),
    approvals: { pending: appr.length, items: appr, decide_here: false,
      note: 'Read-only. Approve or deny in STARNET; remote decisions are disabled on purpose.' },
    receipts,
    cost: summarizeCosts(costRows || []),
    permissions: permissionCards(policy, rosterIds)
  };
}

module.exports = { makeCostLedger, summarizeCosts, permissionCards, buildCommandCenter, PRIVATE_DEFAULT };
