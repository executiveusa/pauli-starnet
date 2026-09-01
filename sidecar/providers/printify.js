/* sidecar/providers/printify.js
 * Pauli STARNET — Printify POD provider adapter.
 * Read-only catalog and order status scope by default.
 * Order submission requires explicit owner approval (Commerce Operator + consent gate).
 *
 * Auth: PRINTIFY_KEY from process.env (injected by Tauri shell or .env.local).
 * API: https://developers.printify.com/
 *
 * SECURITY:
 *  - Key never logged, never appears in tool results or event payloads.
 *  - All write operations are consent-gated (requiresConsent: true in registry).
 *  - Catalog reads are safe (no mutation, no spend).
 */
'use strict';

const BASE_URL = 'https://api.printify.com/v1';

function getKey() {
  const k = process.env.PRINTIFY_KEY;
  if (!k || !k.trim()) throw new Error('PRINTIFY_KEY not configured. Set it in .env.local or via STARNET settings.');
  return k.trim();
}

async function apiFetch(path, opts) {
  opts = opts || {};
  const key = getKey();
  const url = BASE_URL + path;
  const res = await fetch(url, Object.assign({
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      'User-Agent': 'PAULI-STARNET/1.0'
    }
  }, opts));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Printify API ' + res.status + ' at ' + path + ': ' + body.slice(0, 200));
  }
  return res.json();
}

// ─── AUTH PROBE ────────────────────────────────────────────────────────────────
// Minimal read — verifies key is valid without revealing shop data in logs.
async function probe() {
  try {
    const data = await apiFetch('/shops.json');
    const count = Array.isArray(data) ? data.length : (data && data.data ? data.data.length : '?');
    return { ok: true, shops: count, note: 'Printify key valid — ' + count + ' shop(s) accessible' };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

// ─── SHOP LIST (read-only) ────────────────────────────────────────────────────
async function listShops() {
  const data = await apiFetch('/shops.json');
  const rows = Array.isArray(data) ? data : (data.data || []);
  return rows.map(s => ({ id: s.id, title: s.title, sales_channel: s.sales_channel }));
}

// ─── CATALOG SEARCH (read-only) ───────────────────────────────────────────────
// Returns product blueprints from the Printify catalog (no auth needed for blueprints,
// but we route through our adapter for observability).
async function searchCatalog(query, opts) {
  opts = opts || {};
  // Printify catalog endpoint
  const data = await apiFetch('/catalog/blueprints.json');
  const all = Array.isArray(data) ? data : (data.data || []);
  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? all.filter(b => (b.title || '').toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q))
    : all;
  const limit = Math.min(opts.limit || 20, 50);
  return filtered.slice(0, limit).map(b => ({
    id: b.id,
    title: b.title,
    description: (b.description || '').slice(0, 120),
    brand: b.brand,
    model: b.model
  }));
}

// ─── BLUEPRINT DETAIL (read-only) ─────────────────────────────────────────────
async function getBlueprintDetail(blueprintId) {
  if (!blueprintId) throw new Error('blueprintId required');
  return apiFetch('/catalog/blueprints/' + blueprintId + '.json');
}

// ─── PRINT PROVIDERS FOR BLUEPRINT (read-only) ───────────────────────────────
async function getPrintProviders(blueprintId) {
  if (!blueprintId) throw new Error('blueprintId required');
  return apiFetch('/catalog/blueprints/' + blueprintId + '/print_providers.json');
}

// ─── SHIPPING ESTIMATE (read-only) ────────────────────────────────────────────
async function getShippingInfo(blueprintId, providerId) {
  if (!blueprintId || !providerId) throw new Error('blueprintId and providerId required');
  return apiFetch('/catalog/blueprints/' + blueprintId + '/print_providers/' + providerId + '/shipping.json');
}

// ─── SHOP PRODUCT LIST (read-only) ────────────────────────────────────────────
async function listProducts(shopId, page) {
  if (!shopId) throw new Error('shopId required');
  const p = page || 1;
  return apiFetch('/shops/' + shopId + '/products.json?page=' + p + '&limit=20');
}

// ─── ORDER STATUS (read-only) ─────────────────────────────────────────────────
async function getOrderStatus(shopId, orderId) {
  if (!shopId || !orderId) throw new Error('shopId and orderId required');
  return apiFetch('/shops/' + shopId + '/orders/' + orderId + '.json');
}

// ─── CREATE PRODUCT DRAFT (write — consent required) ─────────────────────────
// This function MUST only be called from Commerce Operator with explicit owner approval.
// Registry marks this tool requiresConsent: true.
async function createProductDraft(shopId, productSpec) {
  if (!shopId) throw new Error('shopId required');
  if (!productSpec || !productSpec.title) throw new Error('productSpec.title required');
  // Ensure draft status — never auto-publish
  const body = Object.assign({}, productSpec, { visible: false, status: 'draft' });
  return apiFetch('/shops/' + shopId + '/products.json', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

// ─── SUBMIT ORDER (write — consent required) ──────────────────────────────────
// MUST only be called from Commerce Operator with explicit owner approval receipt.
async function submitOrder(shopId, orderSpec) {
  if (!shopId) throw new Error('shopId required');
  if (!orderSpec) throw new Error('orderSpec required');
  return apiFetch('/shops/' + shopId + '/orders.json', {
    method: 'POST',
    body: JSON.stringify(orderSpec)
  });
}

module.exports = {
  probe,
  listShops,
  searchCatalog,
  getBlueprintDetail,
  getPrintProviders,
  getShippingInfo,
  listProducts,
  getOrderStatus,
  // Write operations (consent-gated by capability registry):
  createProductDraft,
  submitOrder
};
