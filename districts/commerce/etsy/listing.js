'use strict';
// Etsy draft-listing payloads for the Freedom of Speech store, PREPARE ONLY (districts/commerce/CONTEXT.md).
// This module has no network code on purpose: it turns a design that passed the store's gate (freedomofspeech
// stages/03_gate) into the payload stage 04 hands to the owner. Nothing is listed, priced live or published here.
//
// Fields follow Etsy Open API v3 createDraftListing as known on 2026-10-15 (quantity, title, description, price,
// who_made, when_made, taxonomy_id; shipping/return/readiness ids for physical items; production partners for
// print-on-demand). UNVERIFIED against the live spec from this container (etsy.com is not reachable here):
// re-check https://developers.etsy.com before the first live call.

const WHO_MADE = new Set(['i_did', 'someone_else', 'collective']);
const WHEN_MADE = new Set(['made_to_order', '2020_2026', '2010_2019', 'before_2007']);

function problems(design, cfg) {
  const p = [];
  if (!design || design.gate !== 'pass') p.push('design has not passed the store gate (stages/03_gate)');
  if (!design || !design.gate_ref) p.push('gate_ref is required: the gate file that passed this design');
  if (!design || !design.verified_by || design.verified_by === design.built_by) p.push('the design must be verified by someone other than its builder');
  const t = (design && design.title) || '';
  if (!t.trim()) p.push('title is required');
  if (t.length > 140) p.push('title is over 140 characters');
  if (/[^\p{L}\p{N}\s\-',.:&!?%"/()+]/u.test(t)) p.push('title has characters Etsy rejects');
  if (!design || !String(design.description || '').trim()) p.push('description is required');
  const tags = (design && design.tags) || [];
  if (tags.length > 13) p.push('more than 13 tags');
  for (const tag of tags) if (String(tag).length > 20) p.push('tag over 20 characters: ' + tag);
  if (!cfg || !(Number(cfg.price) > 0)) p.push('price must be a positive number (owner sets it; decisions/0004)');
  if (!cfg || !Number.isInteger(cfg.taxonomy_id)) p.push('taxonomy_id is required');
  if (!cfg || !Number.isInteger(cfg.shipping_profile_id)) p.push('shipping_profile_id is required for a physical item');
  if (!cfg || !Number.isInteger(cfg.readiness_state_id)) p.push('readiness_state_id is required for a physical item');
  if (!cfg || !Array.isArray(cfg.production_partner_ids) || !cfg.production_partner_ids.length) p.push('print-on-demand needs its production partner disclosed (production_partner_ids)');
  const banned = (cfg && cfg.banned_terms) || [];
  const text = (t + ' ' + ((design && design.description) || '') + ' ' + tags.join(' ')).toLowerCase();
  for (const term of banned) if (text.includes(String(term).toLowerCase())) p.push('contains a banned term from the legal line: ' + term);
  return p;
}

function buildDraftListing(design, cfg) {
  const errors = problems(design, cfg);
  if (errors.length) return { ok: false, errors };
  const who = cfg.who_made || 'i_did';
  const when = cfg.when_made || 'made_to_order';
  if (!WHO_MADE.has(who) || !WHEN_MADE.has(when)) return { ok: false, errors: ['who_made/when_made value not allowed'] };
  return {
    ok: true,
    payload: {
      quantity: cfg.quantity || 999,
      title: design.title.trim(),
      description: design.description.trim(),
      price: Number(cfg.price),
      who_made: who,
      when_made: when,
      taxonomy_id: cfg.taxonomy_id,
      shipping_profile_id: cfg.shipping_profile_id,
      readiness_state_id: cfg.readiness_state_id,
      production_partner_ids: cfg.production_partner_ids,
      tags: design.tags || [],
      is_supply: false,
      should_auto_renew: false,
      state: 'draft'
    },
    provenance: { design_id: design.id, gate_ref: design.gate_ref, built_by: design.built_by, verified_by: design.verified_by }
  };
}

// The stage 04 output file: the payload plus what the owner must approve. Never a published listing.
function renderListingFile(n, result) {
  const id = String(n).padStart(3, '0');
  if (!result.ok) return '# listing-' + id + ' — NOT READY\n\n' + result.errors.map(e => '- ' + e).join('\n') + '\n';
  return [
    '# listing-' + id + ' — draft payload (not published)',
    '',
    'Design: `' + result.provenance.design_id + '` · gate: `' + result.provenance.gate_ref + '` · built by ' + result.provenance.built_by + ', verified by ' + result.provenance.verified_by,
    '',
    '```json',
    JSON.stringify(result.payload, null, 2),
    '```',
    '',
    'Owner approval needed before anything goes live: price, shipping profile, production partner, first batch (stages/04_listing).',
    ''
  ].join('\n');
}

module.exports = { buildDraftListing, renderListingFile, problems };
