'use strict';

const assert = require('assert');
const { makeWorkforceControlPlane } = require('../sidecar/workforce/index.js');

const plane = makeWorkforceControlPlane({
  env: {
    STARNET_COMPUTE_URL: 'https://compute.example.test',
    STARNET_COMPUTE_TOKEN: 'secret',
    COMPOSIO_API_KEY: 'secret-apps'
  },
  now: () => Date.UTC(2026, 8, 10, 20, 0, 0)
});

const run = plane.planNonprofitReadinessRun({
  organizationId: 'new-world-kids',
  organizationName: 'New World Kids',
  website: 'https://nwkids.org',
  geography: 'Seattle, Washington',
  projectId: 'nwk-first-12',
  budgetUsd: 8
});

assert.equal(run.schema, 'starnet.nonprofit-readiness-run');
assert.equal(run.laneId, 'nonprofit-growth');
assert.equal(run.organization.id, 'new-world-kids');
assert.equal(run.organization.website, 'https://nwkids.org');
assert.equal(run.projectId, 'nwk-first-12');
assert.equal(run.missions.length, 6);
assert.deepEqual(run.missions.map(x => x.key), [
  'truth-set',
  'funding-readiness',
  'digital-trust',
  'opportunity-scan',
  'reversible-digital-fix',
  'commander-brief'
]);
assert.equal(run.missions[0].mission.agentId, 'heisenberg');
assert.equal(run.missions[2].mission.agentId, 'max');
assert.equal(run.missions[2].plan.executionLane, 'browser');
assert.equal(run.missions[4].plan.executionLane, 'shell');
assert.equal(run.missions[4].mission.requiresHumanApproval, false);
assert.ok(run.missions.every(x => x.evidenceRequired.length > 0));
assert.ok(run.missions.slice(1).every(x => x.dependsOn.length === 1));
assert.ok(run.humanApprovalTriggers.includes('production-merge'));
assert.ok(run.humanApprovalTriggers.includes('grant-submission'));
assert.ok(run.completionRule.includes('No step is complete without its required evidence'));

assert.throws(() => plane.planNonprofitReadinessRun({ organizationName: 'Missing id', website: 'https://example.org' }), /ORG_ID/);
assert.throws(() => plane.planNonprofitReadinessRun({ organizationId: 'x', website: 'https://example.org' }), /ORG_NAME/);
assert.throws(() => plane.planNonprofitReadinessRun({ organizationId: 'x', organizationName: 'X' }), /WEBSITE/);

console.log('nonprofit-readiness-run.test.js OK');
