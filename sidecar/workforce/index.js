'use strict';

const Catalog = require('./catalog.js');
const Contracts = require('./contracts.js');
const Router = require('./router.js');
const { makeOrgoProvider } = require('./providers/orgo.js');
const { makeSovereignProvider } = require('./providers/sovereign.js');

function makeWorkforceControlPlane(deps) {
  deps = deps || {};
  const env = deps.env || process.env || {};
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const ids = typeof deps.id === 'function' ? deps.id : (() => 'mission-' + Math.random().toString(36).slice(2, 12));

  const providers = Catalog.computeProviders(env);
  const integrations = Catalog.integrations(env);
  const blueprints = Catalog.AGENT_BLUEPRINTS.map(b => Object.assign({}, b, {
    image: Catalog.NICKS_STACK_IMAGE.id,
    status: 'blueprint'
  }));

  const orgo = makeOrgoProvider({
    apiKey: env.ORGO_API_KEY,
    workspaceId: env.ORGO_WORKSPACE_ID,
    apiBase: env.ORGO_API_BASE,
    request: deps.orgoRequest
  });
  const sovereign = makeSovereignProvider({
    baseUrl: env.STARNET_COMPUTE_URL,
    token: env.STARNET_COMPUTE_TOKEN,
    request: deps.sovereignRequest
  });

  function snapshot() {
    return {
      version: 1,
      generatedAt: new Date(now()).toISOString(),
      product: 'starnet-sovereign-workforce',
      operatorImage: Catalog.NICKS_STACK_IMAGE,
      blueprints: blueprints.map(x => Object.assign({}, x)),
      environment: Catalog.safeEnvironmentSummary(env),
      providers: {
        sovereign: sovereign.safeSummary(),
        orgo: orgo.safeSummary()
      },
      rules: {
        controlPlane: 'starnet',
        ownerCockpit: 'command-center',
        operatorImage: 'nicks-stack',
        computeOrder: ['sovereign', 'local', 'orgo-burst'],
        executionOrder: Router.FAST_PATH,
        secrets: 'references-only',
        persistentAgentsRequireIsolation: true,
        missionWorkersDefaultEphemeral: true
      }
    };
  }

  function getBlueprint(agentId) {
    const key = String(agentId || '').toLowerCase();
    return blueprints.find(x => x.id === key) || null;
  }

  function planAgent(agentId, options) {
    options = options || {};
    const b = getBlueprint(agentId);
    if (!b) throw new Error('UNKNOWN_AGENT_BLUEPRINT');
    const agent = Contracts.normalizeAgent(Object.assign({}, b, options.agent || {}));
    const computer = Router.planComputer(agent, providers, {
      persistent: agent.class === 'persistent',
      requiresIsolation: agent.class === 'persistent',
      allowBurst: options.allowBurst !== false
    });
    return {
      agent,
      computer,
      image: Catalog.NICKS_STACK_IMAGE,
      identity: {
        email: configured('agentmail') ? 'provisionable' : 'not-configured',
        phone: configured('agentphone') ? 'provisionable' : 'not-configured',
        apps: configured('composio') ? 'provisionable' : 'not-configured',
        vault: configured('onepassword') ? 'provisionable' : 'not-configured'
      }
    };
  }

  function configured(id) {
    const row = integrations.find(x => x.id === id);
    return Boolean(row && row.configured);
  }

  function planMission(input) {
    input = input || {};
    const agentId = String(input.agentId || 'heisenberg').toLowerCase();
    const b = getBlueprint(agentId);
    if (!b) throw new Error('UNKNOWN_AGENT_BLUEPRINT');
    const agent = Contracts.normalizeAgent(Object.assign({}, b));
    const mission = Contracts.normalizeMission({
      id: input.id || ids(),
      agentId,
      projectId: input.projectId || null,
      objective: input.objective,
      state: 'planned',
      budgetUsd: input.budgetUsd,
      requiresHumanApproval: input.requiresHumanApproval === true,
      executionLane: input.executionLane || null
    });
    return {
      mission,
      plan: Router.planMission(mission, integrations, providers, agent)
    };
  }

  return {
    snapshot,
    getBlueprint,
    planAgent,
    planMission,
    providers: { orgo, sovereign },
    contracts: Contracts,
    router: Router
  };
}

module.exports = { makeWorkforceControlPlane };
