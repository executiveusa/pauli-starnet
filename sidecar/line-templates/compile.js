'use strict';
const { assertValid } = require('./schema.js');
function compile(template, bindings) {
  const t = assertValid(template); bindings = bindings || {};
  const stages = t.stages.map((stage, index) => ({
    id: stage.id, index, mode: stage.mode,
    workers: stage.roles.map(role => ({ role, agentId: bindings[role] || null })),
    routes: stage.routes ? Object.assign({}, stage.routes) : null,
    defaultRole: stage.defaultRole || null, join: stage.join === true,
    review: stage.mode === 'review-loop' ? { accept: stage.accept, maxPasses: stage.maxPasses } : null
  }));
  const missingRoles = [...new Set(stages.flatMap(s => s.workers.filter(w => !w.agentId).map(w => w.role)))].sort();
  return Object.freeze({
    version: 1, templateId: t.id, executable: missingRoles.length === 0,
    stages, missingRoles, budget: Object.assign({}, t.budget || {}),
    requiresBudgetOverride: t.requiresBudgetOverride === true,
    effects: (t.effects || []).slice(), integration: 'library-only'
  });
}
module.exports = { compile };
