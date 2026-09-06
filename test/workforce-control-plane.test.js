'use strict';

const assert = require('assert');
const { makeWorkforceControlPlane } = require('../sidecar/workforce/index.js');
const Contracts = require('../sidecar/workforce/contracts.js');
const Router = require('../sidecar/workforce/router.js');
const { makeOrgoProvider } = require('../sidecar/workforce/providers/orgo.js');
const { makeSovereignProvider } = require('../sidecar/workforce/providers/sovereign.js');

let n = 0;
function ok(value, message) { assert.ok(value, message); n++; }

const env = {
  STARNET_COMPUTE_URL: 'https://compute.example.test',
  STARNET_COMPUTE_TOKEN: 'super-secret-compute-token',
  ORGO_API_KEY: 'sk_live_do_not_leak',
  ORGO_WORKSPACE_ID: 'ws_123',
  AGENTMAIL_API_KEY: 'am_secret',
  COMPOSIO_CONSUMER_KEY: 'ck_secret',
  OP_SERVICE_ACCOUNT_TOKEN: 'ops_secret'
};
const plane = makeWorkforceControlPlane({
  env,
  now: () => Date.UTC(2026, 8, 6, 12, 0, 0),
  id: () => 'mission-test-1'
});

// Snapshot is useful but secret-free.
{
  const s = plane.snapshot();
  ok(s.product === 'starnet-sovereign-workforce', 'snapshot names the product');
  ok(s.operatorImage.version === '0.2.2', 'Nick Stack image is pinned to v0.2.2');
  ok(s.operatorImage.source.sha === '90b9975c5391591e98565d20d33554a6b91f2f85', 'upstream image SHA is pinned');
  ok(s.operatorImage.mirror.stale === true && s.operatorImage.mirror.version === '0.1.1', 'older Pauli mirror is surfaced as stale, not silently treated as current');
  ok(s.rules.controlPlane === 'starnet' && s.rules.ownerCockpit === 'command-center', 'ownership boundary is explicit');
  const encoded = JSON.stringify(s);
  for (const secret of ['super-secret-compute-token', 'sk_live_do_not_leak', 'am_secret', 'ck_secret', 'ops_secret']) {
    ok(!encoded.includes(secret), 'snapshot never emits secret value: ' + secret.slice(0, 4));
  }
}

// Persistent employees get an isolated sovereign computer first when configured.
{
  const p = plane.planAgent('heisenberg');
  ok(p.agent.class === 'persistent', 'Heisenberg is a persistent operator blueprint');
  ok(p.computer.ok === true && p.computer.provider === 'sovereign', 'sovereign compute wins for persistent operator');
  ok(p.computer.isolated === true && p.computer.ephemeral === false, 'persistent operator requests isolated durable computer');
  ok(p.identity.email === 'provisionable', 'AgentMail readiness is projected without provisioning');
  ok(p.identity.apps === 'provisionable' && p.identity.vault === 'provisionable', 'apps and vault readiness are projected');
}

// Fast-path router avoids visual computer use for code tasks.
{
  const m = plane.planMission({ agentId: 'heisenberg', objective: 'Run the test suite and deploy the Node service' });
  ok(m.mission.id === 'mission-test-1', 'injected deterministic mission id used');
  ok(m.plan.executionLane === 'shell', 'CLI/code objective selects shell');
  ok(m.plan.computerRequired === false, 'shell task does not require GUI computer allocation');
  ok(m.plan.rule === 'fastest-deterministic-least-privileged-first', 'router carries fast-path rule');
}

// Browser work requests a computer, but still routes before desktop/vision.
{
  const m = plane.planMission({ agentId: 'max', objective: 'Open the website dashboard in the browser and inspect the form' });
  ok(m.plan.executionLane === 'browser', 'browser objective selects CDP/browser lane');
  ok(m.plan.computerRequired === true, 'browser lane requires a computer');
  ok(m.plan.computer.provider === 'sovereign', 'browser computer uses sovereign provider first');
  ok(m.plan.fallbackLanes[0] === 'desktop' && m.plan.fallbackLanes[1] === 'vision', 'desktop and vision stay fallbacks');
}

// With no isolated provider, a persistent employee fails closed rather than sharing local host state.
{
  const p = makeWorkforceControlPlane({ env: {}, id: () => 'mission-x', now: () => 0 }).planAgent('fanni', { allowBurst: false });
  ok(p.computer.ok === false, 'persistent operator without isolated provider is blocked');
  ok(p.computer.blocker === 'NO_ISOLATED_COMPUTE_PROVIDER', 'blocker is explicit');
}

// Contracts refuse malformed IDs and preserve credential references only.
{
  assert.throws(() => Contracts.normalizeAgent({ id: '../bad' }), /invalid/); n++;
  const i = Contracts.normalizeIdentity({ id: 'id-1', agentId: 'max', credentialRefs: ['op://Hermes/Max/GitHub'] });
  ok(i.credentialRefs.length === 1 && i.credentialRefs[0].startsWith('op://'), 'identity contract stores secret references, not values');
}

// Provider adapters build real request shapes but do not create paid resources in tests.
{
  const orgo = makeOrgoProvider({ apiKey: 'secret', workspaceId: 'ws', apiBase: 'https://www.orgo.ai/api' });
  const spec = orgo.createSpec({ name: 'max-primary' });
  ok(spec.method === 'POST' && spec.url.endsWith('/computers'), 'Orgo adapter targets computer creation endpoint');
  ok(spec.body.template_ref === 'default/nicks-stack@0.2.2', 'Orgo burst path uses pinned Nick Stack template');
  ok(!JSON.stringify(orgo.safeSummary()).includes('secret'), 'Orgo safe summary never leaks key');

  const sovereign = makeSovereignProvider({ baseUrl: 'https://compute.example.test', token: 'private' });
  const s = sovereign.createSpec({ name: 'qa-1', agentId: 'heisenberg', ephemeral: true });
  ok(s.url === 'https://compute.example.test/v1/computers', 'sovereign provider targets stable computer contract');
  ok(s.body.image === 'nicks-stack' && s.body.ephemeral === true, 'sovereign provider carries image and lifecycle intent');
  ok(!JSON.stringify(sovereign.safeSummary()).includes('private'), 'sovereign safe summary never leaks token');
}

// Execution ordering remains fixed and inspectable.
{
  ok(Router.FAST_PATH.join('>') === 'connector>mcp>shell>browser>desktop>vision', 'execution ladder is locked');
}

console.log('workforce-control-plane.test.js OK —', n, 'assertions');
