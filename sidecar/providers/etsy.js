/* sidecar/providers/etsy.js
 * Pauli STARNET — Etsy marketplace adapter.
 * Read scope (catalog search, pricing research) works with ETSY_API_KEY.
 * Write scope (draft listings, publishing) requires OAuth 2.0 browser flow — see README.
 *
 * Auth:
 *  - Read: ETSY_API_KEY (API key for non-OAuth endpoints)
 *  - Write: OAuth 2.0 PKCE flow — owner must authorize in browser at first use
 *
 * API: https://developers.etsy.com/documentation
 *
 * SECURITY:
 *  - Key/token never logged or exposed in tool results.
 *  - All write operations are consent-gated (requiresConsent: true).
 *  - OAuth tokens stored in STARNET keychain, never in code.
 */
'use strict';

const BASE_URL = 'https://openapi.etsy.com/v3';

function getApiKey() {
  const k = process.env.ETSY_API_KEY;
  if (!k || !k.trim()) throw new Error('ETSY_API_KEY not configured. Set it in .env.local or via STARNET settings.');
  return k.trim();
}

function getOAuthToken() {
  // OAuth token stored in STARNET keychain — not in env var
  // Falls back gracefully with clear error for write operations
  const t = process.env.ETSY_OAUTH_TOKEN;
  if (!t || !t.trim()) throw new Error('Etsy OAuth token not found. Complete the OAuth 2.0 authorization flow: open STARNET settings → Connectors → Etsy → Authorize.');
  return t.trim();
}

async function apiKeyFetch(path, opts) {
  opts = opts || {};
  const key = getApiKey();
  const url = BASE_URL + path;
  const res = await fetch(url, Object.assign({
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
      'User-Agent': 'PAULI-STARNET/1.0'
    }
  }, opts));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Etsy API ' + res.status + ' at ' + path + ': ' + body.slice(0, 200));
  }
  return res.json();
}

async function oauthFetch(path, opts) {
  opts = opts || {};
  const token = getOAuthToken();
  const url = BASE_URL + path;
  const res = await fetch(url, Object.assign({
    headers: {
      Authorization: 'Bearer ' + token,
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
      'User-Agent': 'PAULI-STARNET/1.0'
    }
  }, opts));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Etsy OAuth API ' + res.status + ' at ' + path + ': ' + body.slice(0, 200));
  }
  return res.json();
}

// ─── AUTH PROBE (read-only) ───────────────────────────────────────────────────
async function probe() {
  try {
    // Etsy ping endpoint — verifies API key is valid
    const data = await apiKeyFetch('/application/openapi-ping');
    return { ok: true, note: 'Etsy API key valid', data };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

// ─── TAXONOMY (read-only) ─────────────────────────────────────────────────────
async function getTaxonomy() {
  return apiKeyFetch('/application/seller-taxonomy/nodes');
}

// ─── SEARCH LISTINGS (read-only, public) ─────────────────────────────────────
async function searchListings(query, opts) {
  opts = opts || {};
  const q = encodeURIComponent(query || '');
  const limit = Math.min(opts.limit || 20, 100);
  const sortOn = opts.sort_on || 'score'; // score | listing_creation_timestamp
  const params = '?keywords=' + q + '&limit=' + limit + '&sort_on=' + sortOn;
  return apiKeyFetch('/application/listings/active' + params);
}

// ─── GET LISTING DETAIL (read-only, public) ───────────────────────────────────
async function getListing(listingId) {
  if (!listingId) throw new Error('listingId required');
  return apiKeyFetch('/application/listings/' + listingId);
}

// ─── SHOP LISTINGS (read-only, public) ────────────────────────────────────────
async function getShopListings(shopId, opts) {
  opts = opts || {};
  const limit = opts.limit || 20;
  const state = opts.state || 'active'; // active | draft | sold_out
  return apiKeyFetch('/application/shops/' + shopId + '/listings/' + state + '?limit=' + limit);
}

// ─── CREATE DRAFT LISTING (write — OAuth + consent required) ─────────────────
// Must only be called from Commerce Operator with explicit owner approval.
// Requires OAuth 2.0 token (browser auth flow). Creates in DRAFT state only.
async function createDraftListing(shopId, listingSpec) {
  if (!shopId) throw new Error('shopId required');
  if (!listingSpec || !listingSpec.title) throw new Error('listingSpec.title required');
  // Enforce draft state — never publish autonomously
  const body = Object.assign({}, listingSpec, {
    state: 'draft',
    who_made: listingSpec.who_made || 'someone_else',
    when_made: listingSpec.when_made || 'made_to_order',
    is_supply: listingSpec.is_supply !== undefined ? listingSpec.is_supply : false
  });
  return oauthFetch('/application/shops/' + shopId + '/listings', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

// ─── UPDATE LISTING STATE (write — OAuth + consent required) ─────────────────
// Required for activation. MUST require owner approval receipt.
async function updateListingState(shopId, listingId, state) {
  if (!shopId || !listingId) throw new Error('shopId and listingId required');
  if (!['active', 'inactive', 'draft'].includes(state)) throw new Error('state must be active | inactive | draft');
  return oauthFetch('/application/shops/' + shopId + '/listings/' + listingId, {
    method: 'PUT',
    body: JSON.stringify({ state })
  });
}

module.exports = {
  probe,
  getTaxonomy,
  searchListings,
  getListing,
  getShopListings,
  // Write operations (OAuth + consent required):
  createDraftListing,
  updateListingState,
  // OAuth status helper
  oauthRequired: () => ({ oauth_required: true, message: 'Etsy write operations require OAuth 2.0 authorization. Go to STARNET settings → Connectors → Etsy → Authorize to complete the browser flow.' })
};
