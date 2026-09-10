'use strict';

const assert = require('assert');
const { makeWorkforceControlPlane } = require('../sidecar/workforce/index.js');

const plane = makeWorkforceControlPlane({ env: {}, id: () => 'mission-nonprofit-1', now: () => 0 });
const lane = plane.getBusinessLane('nonprofit-growth');

assert.ok(lane, 'nonprofit-growth business lane exists');
assert.strictEqual(lane.district, 'impact', 'nonprofit growth reuses the canonical Impact District');
assert.strictEqual(lane.workerPolicy, 'mission-workers-by-default', 'specialist nonprofit work uses mission workers by default');
assert.ok(lane.stages.includes('baseline-audit'), 'lane includes baseline audit');
assert.ok(lane.stages.includes('claim-verification'), 'lane includes claim verification before action');
assert.ok(lane.stages.includes('funding-readiness'), 'lane includes funding readiness');
assert.ok(lane.stages.includes('digital-trust'), 'lane includes digital trust');
assert.ok(lane.stages.includes('funding-discovery'), 'lane includes funding discovery');
assert.ok(lane.stages.includes('evidence-review'), 'lane includes evidence review');
assert.ok(lane.workflowSkills.includes('client-presence-audit'), 'lane reuses existing client presence audit');
assert.ok(lane.workflowSkills.includes('nonprofit-funding-readiness'), 'lane exposes nonprofit funding readiness skill');
assert.ok(lane.workflowSkills.includes('grant-fit-screening'), 'lane exposes grant fit screening skill');
assert.ok(lane.workflowSkills.includes('major-donor-discovery'), 'lane exposes major donor discovery skill');
assert.ok(lane.approvalPoints.includes('legal-attestation'), 'legal attestations require approval');
assert.ok(lane.approvalPoints.includes('financial-commitment'), 'financial commitments require approval');
assert.ok(lane.evidenceRequired.includes('claim-verification-status'), 'claim verification is required evidence');
assert.ok(lane.evidenceRequired.includes('artifact-or-action-receipt'), 'completed work requires an action receipt');
assert.deepStrictEqual(lane.autonomyPolicy.executionOrder, ['connector', 'mcp', 'shell', 'browser', 'desktop', 'vision']);
assert.strictEqual(lane.autonomyPolicy.neverFabricateCompletion, true, 'truth contract stays explicit');
assert.ok(plane.snapshot().businessLanes.some(x => x.id === 'nonprofit-growth'), 'workforce snapshot exposes nonprofit growth lane');

console.log('nonprofit-growth-lane.test.js OK');
