'use strict';

const MODES = new Set(['single', 'sequence', 'classify', 'round-robin', 'fan-out', 'merge', 'review-loop']);
const ROLE = /^[a-z][a-z0-9-]{0,39}$/;
const ID = /^[a-z][a-z0-9-]{0,63}$/;

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function validate(template) {
  const errors = [];
  if (!template || typeof template !== 'object' || Array.isArray(template)) return { ok: false, errors: ['template must be an object'] };
  if (!ID.test(String(template.id || ''))) errors.push('id must be a stable kebab-case identifier');
  if (!String(template.name || '').trim()) errors.push('name is required');
  if (!Array.isArray(template.stages) || !template.stages.length) errors.push('stages must be a non-empty array');
  const seen = new Set();
  for (const [i, stage] of (template.stages || []).entries()) {
    const at = 'stages[' + i + ']';
    if (!stage || typeof stage !== 'object') { errors.push(at + ' must be an object'); continue; }
    if (!ID.test(String(stage.id || ''))) errors.push(at + '.id is invalid');
    else if (seen.has(stage.id)) errors.push(at + '.id is duplicated'); else seen.add(stage.id);
    if (!MODES.has(stage.mode)) errors.push(at + '.mode is unsupported');
    if (!Array.isArray(stage.roles) || !stage.roles.length || stage.roles.some(r => !ROLE.test(String(r)))) errors.push(at + '.roles must contain valid role ids');
    if (stage.mode === 'fan-out' && stage.roles.length < 2) errors.push(at + ' fan-out needs at least two roles');
    if (stage.mode === 'review-loop') {
      if (!Number.isInteger(stage.maxPasses) || stage.maxPasses < 1 || stage.maxPasses > 5) errors.push(at + '.maxPasses must be 1..5');
      if (!String(stage.accept || '').trim()) errors.push(at + '.accept is required');
    } else if (stage.maxPasses != null) errors.push(at + '.maxPasses is only valid on review-loop');
    if (stage.mode === 'classify') {
      if (!stage.routes || typeof stage.routes !== 'object' || Array.isArray(stage.routes) || !Object.keys(stage.routes).length) errors.push(at + '.routes are required');
      else for (const role of Object.values(stage.routes)) if (!stage.roles.includes(role)) errors.push(at + '.routes target an undeclared role');
      if (!stage.defaultRole || !stage.roles.includes(stage.defaultRole)) errors.push(at + '.defaultRole must name a declared role');
    }
    if (stage.mode === 'fan-out' && stage.join !== true) errors.push(at + ' fan-out must declare join:true');
  }
  const b = template.budget || {};
  for (const k of ['maxUsdPerRun', 'maxUsdPerDay']) if (b[k] != null && (!(b[k] >= 0) || !Number.isFinite(b[k]))) errors.push('budget.' + k + ' must be a non-negative number');
  if (template.effects && template.effects.some(x => !['internal', 'draft', 'external-send', 'publish', 'spend'].includes(x))) errors.push('effects contains an unsupported value');
  if ((template.effects || []).some(x => ['external-send', 'publish', 'spend'].includes(x))) errors.push('templates may not imply external sends, publishing, or spending');
  return { ok: errors.length === 0, errors };
}
function assertValid(template) { const r = validate(template); if (!r.ok) throw new Error(r.errors.join('; ')); return clone(template); }
module.exports = { validate, assertValid, MODES: Object.freeze([...MODES]) };
