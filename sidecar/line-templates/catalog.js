'use strict';
const { assertValid } = require('./schema.js');
const T = (id, name, description, stages, extra) => Object.freeze(assertValid(Object.assign({ id, name, description, stages, effects: ['internal', 'draft'] }, extra || {})));
const S = (id, mode, roles, extra) => Object.assign({ id, mode, roles }, extra || {});
const CATALOG = Object.freeze([
  T('front-desk', 'Front Desk', 'One owner takes work from intake to a reviewable result.', [S('work', 'single', ['generalist'])]),
  T('allowance-desk', 'Allowance Desk', 'A single-owner lane with explicit run and daily ceilings supplied at launch.', [S('work', 'single', ['generalist'])], { budget: { maxUsdPerRun: 0, maxUsdPerDay: 0 }, requiresBudgetOverride: true }),
  T('two-doors', 'Two Doors', 'Two named intake streams share one worker and one result queue.', [S('merge-intakes', 'merge', ['generalist']), S('work', 'single', ['generalist'])]),
  T('research-line', 'Research Line', 'Research is handed to a writer without mixing the roles.', [S('research', 'sequence', ['researcher']), S('write', 'sequence', ['writer'])]),
  T('revision-loop', 'Revision Loop', 'A writer revises against an independent review, with a hard pass ceiling.', [S('draft', 'sequence', ['writer']), S('review', 'review-loop', ['reviewer', 'writer'], { accept: 'approved', maxPasses: 3 })]),
  T('sorting-office', 'Sorting Office', 'Code goes to an engineer; everything else goes to a generalist.', [S('route', 'classify', ['engineer', 'generalist'], { routes: { code: 'engineer' }, defaultRole: 'generalist' })], { default: false }),
  T('triage-desk', 'Triage Desk', 'Code, research, and general work go to the right specialist before one internal result queue.', [S('route', 'classify', ['engineer', 'researcher', 'generalist'], { routes: { code: 'engineer', research: 'researcher' }, defaultRole: 'generalist' }), S('collect', 'merge', ['generalist'])]),
  T('load-spread', 'Load Spread', 'Successive jobs rotate across equivalent workers; a job is not duplicated.', [S('dispatch', 'round-robin', ['worker-a', 'worker-b'])]),
  T('research-swarm', 'Research Swarm', 'Independent researchers inspect the same question, then an analyst reconciles their evidence.', [S('research', 'fan-out', ['researcher-a', 'researcher-b', 'researcher-c'], { join: true }), S('synthesize', 'sequence', ['analyst'])]),
  T('second-opinion', 'Second Opinion', 'Two workers answer independently and both views remain visible.', [S('opinions', 'fan-out', ['reviewer-a', 'reviewer-b'], { join: true })]),
  T('assembly-line', 'Assembly Line', 'Research, analysis, writing, and final packaging stay separate and ordered.', [S('research', 'sequence', ['researcher']), S('analyze', 'sequence', ['analyst']), S('write', 'sequence', ['writer']), S('package', 'sequence', ['shipper'])]),
  T('code-foundry', 'Code Foundry', 'Code is built and reviewed through a bounded loop; non-code work takes a general lane.', [S('route', 'classify', ['engineer', 'generalist'], { routes: { code: 'engineer' }, defaultRole: 'generalist' }), S('review-code', 'review-loop', ['reviewer', 'engineer'], { accept: 'approved', maxPasses: 3 })]),
  T('gauntlet', 'Gauntlet', 'Two independent attempts are synthesized and held behind bounded review.', [S('attempts', 'fan-out', ['worker-a', 'worker-b'], { join: true }), S('synthesize', 'sequence', ['analyst']), S('review', 'review-loop', ['reviewer', 'analyst'], { accept: 'approved', maxPasses: 3 })]),
  T('crucible', 'Crucible', 'Draft approval and polish approval are separate bounded quality gates.', [S('draft', 'review-loop', ['writer', 'reviewer'], { accept: 'approved', maxPasses: 3 }), S('polish', 'review-loop', ['editor', 'reviewer'], { accept: 'approved', maxPasses: 3 })]),
  T('mission-control', 'Mission Control', 'Classified work follows code, research, or general lanes and returns to one internal result.', [S('route', 'classify', ['engineer', 'researcher', 'generalist'], { routes: { code: 'engineer', research: 'researcher' }, defaultRole: 'generalist' }), S('specialist-handoff', 'sequence', ['reviewer']), S('collect', 'merge', ['generalist'])]),
  T('deep-dive', 'Deep Dive', 'A research swarm feeds analysis, writing, and bounded review.', [S('research', 'fan-out', ['researcher-a', 'researcher-b', 'researcher-c'], { join: true }), S('analyze', 'sequence', ['analyst']), S('write', 'sequence', ['writer']), S('review', 'review-loop', ['reviewer', 'writer'], { accept: 'approved', maxPasses: 3 })], { requiresBudgetOverride: true })
]);
function list() { return CATALOG.map(x => JSON.parse(JSON.stringify(x))); }
function get(id) { const x = CATALOG.find(t => t.id === id); return x ? JSON.parse(JSON.stringify(x)) : null; }
module.exports = { CATALOG, list, get };
