/* models.js - model policy (program/starnet-v2/03_spend-and-kill, captain decisions D12/D15).
   Default model = the NEWEST DeepSeek on OpenRouter, resolved live from the public model listing (never a hard-coded id).
   Opus runs ONLY when the captain says so: a time-boxed grant recorded in a file; without it, any Opus id is refused.
   Callers that pick models (the sidecar model switcher, Instinct) read GET /v1/models/default and ask allowed() first. */
'use strict';

const fs = require('fs');
const path = require('path');

const LISTING_URL = 'https://openrouter.ai/api/v1/models';
const OPUS = /(^|\/)claude-opus|(^|\/)opus/i;

// Newest DeepSeek by `created`: real model ids only (no ~aliases, :free, :batch or experimental/vision variants).
function pickNewestDeepSeek(listing) {
  const rows = (listing && Array.isArray(listing.data) ? listing.data : [])
    .filter(m => m && typeof m.id === 'string' && m.id.startsWith('deepseek/'))
    .filter(m => !/[:~]|-exp\b|vision/.test(m.id) && Number.isFinite(Number(m.created)));
  rows.sort((a, b) => Number(b.created) - Number(a.created) || a.id.localeCompare(b.id));
  const m = rows[0];
  if (!m) return null;
  const per = v => Number.isFinite(Number(v)) ? Math.round(Number(v) * 1e6 * 1e6) / 1e6 : null;
  return { model: m.id, created: Number(m.created), usd_per_mtok_in: per(m.pricing && m.pricing.prompt), usd_per_mtok_out: per(m.pricing && m.pricing.completion), context: m.context_length || null };
}

function makeModelPolicy({ defaultFile, opusFile, now = () => Date.now() }) {
  function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return null; } }
  function opusGrant() {
    const g = readJson(opusFile);
    return g && g.until && Date.parse(g.until) > now() ? g : null;
  }
  function allowed(modelId) {
    const id = String(modelId || '');
    if (!id) return { ok: false, reason: 'no model' };
    if (OPUS.test(id) && !opusGrant()) return { ok: false, reason: 'OPUS_NEEDS_CAPTAIN', detail: 'Opus runs only when the captain says so (POST /v1/models/opus)' };
    return { ok: true };
  }
  // The captain's "use Opus for this": a window of 1-240 minutes, recorded with the reason.
  function grantOpus({ by, confirm, minutes, reason }) {
    const mins = Number(minutes);
    if (by !== 'captain' || confirm !== 'opus') return { code: 403, body: { error: 'only the captain grants Opus (by: "captain", confirm: "opus")' } };
    if (!Number.isInteger(mins) || mins < 1 || mins > 240) return { code: 400, body: { error: 'minutes must be 1-240' } };
    const g = { by: 'captain', reason: String(reason || '').slice(0, 300), granted_at: new Date(now()).toISOString(), until: new Date(now() + mins * 60000).toISOString() };
    fs.mkdirSync(path.dirname(opusFile), { recursive: true });
    fs.writeFileSync(opusFile, JSON.stringify(g), { mode: 0o600 });
    return { code: 200, body: { opus: g } };
  }
  function current() {
    const d = readJson(defaultFile);
    return { default: d, default_source: d ? 'resolved ' + d.resolved_at + ' from ' + LISTING_URL : 'not resolved yet (run scripts/models/resolve-default.js)', opus: opusGrant() || { allowed: false } };
  }
  return { allowed, grantOpus, current };
}

module.exports = { pickNewestDeepSeek, makeModelPolicy, LISTING_URL };
