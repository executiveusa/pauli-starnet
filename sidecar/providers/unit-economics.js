/* sidecar/providers/unit-economics.js
 * Pauli STARNET — POD Unit Economics schema and calculator.
 * Tracks per-product economics: cost, fees, margin.
 * 
 * PRINCIPLE: Unknown data is displayed as unknown, never as $0.
 * No interpolation. No averages. No invented figures.
 * Stale data (>7 days) is flagged explicitly.
 */
'use strict';

const MS_PER_DAY = 86400000;
const STALE_DAYS = 7;

// ─── BLANK ECONOMICS RECORD ────────────────────────────────────────────────────
function blankRecord(sku, provider) {
  return {
    sku: sku || '',
    provider: provider || '',
    // Revenue
    sale_price: null,         // USD — what the buyer pays
    // Costs
    base_cost: null,          // USD — provider base cost
    shipping_cost: null,      // USD — shipping to buyer
    // Marketplace fees
    marketplace_fee_pct: null, // e.g., 0.065 = 6.5% (Etsy)
    marketplace_fee_fixed: null, // USD fixed per transaction
    payment_fee_pct: null,    // e.g., 0.03 = 3% (Stripe/PayPal)
    payment_fee_fixed: null,  // USD fixed per transaction
    // Optional
    ad_cost: null,            // USD — allocated advertising cost per sale
    refund_reserve: null,     // USD — per-sale reserve for refunds
    // Computed (filled by calculate(), null if inputs missing)
    gross_margin: null,       // sale_price - base_cost - shipping_cost
    gross_margin_pct: null,   // gross_margin / sale_price
    contribution_margin: null, // gross_margin - all fees - ad_cost - refund_reserve
    contribution_margin_pct: null, // contribution_margin / sale_price
    // Metadata
    status: 'draft',          // draft | live | paused | archived
    data_quality: 'unknown',  // fresh | stale | partial | unknown
    last_updated: null,       // ISO timestamp of last economics update
    notes: ''
  };
}

// ─── CALCULATE MARGINS ─────────────────────────────────────────────────────────
// Returns a new record with computed fields filled in.
// Any null input leaves the computed field null — no invented values.
function calculate(record) {
  const r = Object.assign({}, record);
  
  // Gross margin: sale - base cost - shipping
  if (r.sale_price !== null && r.base_cost !== null) {
    const shipping = r.shipping_cost !== null ? r.shipping_cost : null;
    if (shipping !== null) {
      r.gross_margin = round2(r.sale_price - r.base_cost - shipping);
      r.gross_margin_pct = r.sale_price > 0 ? round4(r.gross_margin / r.sale_price) : null;
    }
  }

  // Contribution margin: gross - fees - ad - reserve
  if (r.gross_margin !== null && r.sale_price !== null) {
    let fees = 0;
    let feeKnown = true;
    
    // Marketplace fee
    if (r.marketplace_fee_pct !== null) fees += r.sale_price * r.marketplace_fee_pct;
    else feeKnown = false;
    if (r.marketplace_fee_fixed !== null) fees += r.marketplace_fee_fixed;

    // Payment fee
    if (r.payment_fee_pct !== null) fees += r.sale_price * r.payment_fee_pct;
    else feeKnown = false;
    if (r.payment_fee_fixed !== null) fees += r.payment_fee_fixed;

    // Optional costs (no penalty for missing — they're genuinely optional)
    const ad = r.ad_cost !== null ? r.ad_cost : 0;
    const reserve = r.refund_reserve !== null ? r.refund_reserve : 0;

    if (feeKnown) {
      r.contribution_margin = round2(r.gross_margin - fees - ad - reserve);
      r.contribution_margin_pct = r.sale_price > 0 ? round4(r.contribution_margin / r.sale_price) : null;
    }
  }

  // Data quality
  r.data_quality = assessQuality(r);
  return r;
}

// ─── DATA QUALITY ASSESSMENT ──────────────────────────────────────────────────
function assessQuality(r) {
  const requiredFields = ['sale_price', 'base_cost', 'shipping_cost', 'marketplace_fee_pct', 'payment_fee_pct'];
  const hasAll = requiredFields.every(f => r[f] !== null);
  if (!hasAll) return 'partial';
  if (!r.last_updated) return 'unknown';
  const age = Date.now() - new Date(r.last_updated).getTime();
  return age > STALE_DAYS * MS_PER_DAY ? 'stale' : 'fresh';
}

// ─── ETSY FEE PRESETS (2026) ──────────────────────────────────────────────────
const ETSY_FEES = {
  listing_fee: 0.20,         // USD per listing (90-day, not per sale)
  transaction_fee_pct: 0.065, // 6.5% of sale price + shipping
  payment_processing_pct: 0.03, // 3% + $0.25 for Etsy Payments
  payment_processing_fixed: 0.25
};

// ─── PRINTIFY COST ESTIMATE ────────────────────────────────────────────────────
// Builds a blank record with Printify + Etsy fee presets applied.
function printifyEtsyTemplate(sku, salePrice, baseCost, shippingCost) {
  const r = blankRecord(sku, 'printify');
  r.sale_price = salePrice || null;
  r.base_cost = baseCost || null;
  r.shipping_cost = shippingCost || null;
  r.marketplace_fee_pct = ETSY_FEES.transaction_fee_pct;
  r.marketplace_fee_fixed = 0; // listing fee amortized separately
  r.payment_fee_pct = ETSY_FEES.payment_processing_pct;
  r.payment_fee_fixed = ETSY_FEES.payment_processing_fixed;
  r.last_updated = new Date().toISOString();
  return calculate(r);
}

// ─── FORMAT FOR DISPLAY ────────────────────────────────────────────────────────
function formatSummary(r) {
  const fmt = (v) => v !== null ? '$' + v.toFixed(2) : 'UNKNOWN';
  const pct = (v) => v !== null ? (v * 100).toFixed(1) + '%' : 'UNKNOWN';
  return {
    sku: r.sku,
    provider: r.provider,
    sale_price: fmt(r.sale_price),
    base_cost: fmt(r.base_cost),
    shipping: fmt(r.shipping_cost),
    gross_margin: fmt(r.gross_margin) + ' (' + pct(r.gross_margin_pct) + ')',
    contribution_margin: fmt(r.contribution_margin) + ' (' + pct(r.contribution_margin_pct) + ')',
    data_quality: r.data_quality,
    status: r.status,
    last_updated: r.last_updated || 'UNKNOWN'
  };
}

// ─── VALIDATION ────────────────────────────────────────────────────────────────
function validate(r) {
  const errors = [];
  if (!r.sku) errors.push('sku is required');
  if (!r.provider) errors.push('provider is required');
  if (r.sale_price !== null && r.sale_price <= 0) errors.push('sale_price must be > 0');
  if (r.base_cost !== null && r.base_cost < 0) errors.push('base_cost cannot be negative');
  if (r.gross_margin !== null && r.contribution_margin !== null) {
    if (r.contribution_margin > r.gross_margin) errors.push('contribution_margin exceeds gross_margin — check fee inputs');
  }
  return { valid: errors.length === 0, errors };
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────────
function round2(v) { return Math.round(v * 100) / 100; }
function round4(v) { return Math.round(v * 10000) / 10000; }

module.exports = {
  blankRecord,
  calculate,
  printifyEtsyTemplate,
  formatSummary,
  validate,
  assessQuality,
  ETSY_FEES,
  STALE_DAYS
};
