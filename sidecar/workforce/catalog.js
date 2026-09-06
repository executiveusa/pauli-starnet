'use strict';

// Workforce catalog: pure data + truth-preserving readiness selectors.
// No secret values are ever returned from this module.

const NICKS_STACK_IMAGE = Object.freeze({
  id: 'nicks-stack',
  label: "Nick's Stack / Dewey parity",
  version: '0.2.2',
  source: Object.freeze({
    repo: 'nickvasilescu/nicks-stack',
    sha: '90b9975c5391591e98565d20d33554a6b91f2f85',
    templateRef: 'default/nicks-stack@0.2.2'
  }),
  mirror: Object.freeze({
    repo: 'executiveusa/pauli-nicks-stack-orgo',
    sha: 'ad146427dacffa228e30d8b8c27e1615bd1ef4c5',
    version: '0.1.1',
    stale: true
  }),
  capabilities: Object.freeze([
    'hermes', 'telegram', 'agentmail', 'agentphone', 'agentcard', 'composio',
    'onepassword', 'obsidian', 'latitude', 'desktop-control', 'mcp', 'skills'
  ])
});

const AGENT_BLUEPRINTS = Object.freeze([
  Object.freeze({ id: 'cosmos', role: 'executive-orchestrator', class: 'persistent', defaultComputer: true }),
  Object.freeze({ id: 'heisenberg', role: 'first-mate', class: 'persistent', defaultComputer: true }),
  Object.freeze({ id: 'max', role: 'operations-operator', class: 'persistent', defaultComputer: true }),
  Object.freeze({ id: 'fanni', role: 'enterprise-operator', class: 'persistent', defaultComputer: true }),
  Object.freeze({ id: 'montage', role: 'media-operator', class: 'persistent', defaultComputer: true })
]);

function present(env, key) {
  return Boolean(env && typeof env[key] === 'string' && env[key].trim());
}

function computeProviders(env) {
  env = env || {};
  return [
    {
      id: 'sovereign',
      label: 'StarNet Sovereign Compute',
      kind: 'remote-compute-api',
      configured: present(env, 'STARNET_COMPUTE_URL') && present(env, 'STARNET_COMPUTE_TOKEN'),
      primary: true,
      isolation: 'provider-defined',
      purpose: 'owned VPS / VM / container-desktop fabric'
    },
    {
      id: 'local',
      label: 'StarNet Local Host',
      kind: 'local-host',
      configured: true,
      primary: false,
      isolation: 'none',
      purpose: 'development and attended local execution; not a multi-tenant computer factory'
    },
    {
      id: 'orgo',
      label: 'Orgo Burst Compute',
      kind: 'managed-cloud-computer',
      configured: present(env, 'ORGO_API_KEY') && present(env, 'ORGO_WORKSPACE_ID'),
      primary: false,
      burst: true,
      isolation: 'vm',
      purpose: 'optional overflow / disposable computer capacity'
    }
  ];
}

function integrations(env) {
  env = env || {};
  return [
    { id: 'agentmail', kind: 'identity-email', configured: present(env, 'AGENTMAIL_API_KEY') },
    { id: 'agentphone', kind: 'identity-phone', configured: present(env, 'AGENTPHONE_API_KEY') },
    { id: 'agentcard', kind: 'spend-card', configured: present(env, 'AGENTCARD_API_KEY') || present(env, 'AGENTCARD_OAUTH_ENABLED') },
    { id: 'composio', kind: 'app-bridge', configured: present(env, 'COMPOSIO_CONSUMER_KEY') || present(env, 'COMPOSIO_API_KEY') },
    { id: 'onepassword', kind: 'secret-plane', configured: present(env, 'OP_SERVICE_ACCOUNT_TOKEN') },
    { id: 'latitude', kind: 'observability', configured: present(env, 'LATITUDE_API_KEY') },
    { id: 'telegram', kind: 'owner-channel', configured: present(env, 'TELEGRAM_BOT_TOKEN') || present(env, 'TELEGRAM_ENABLED') },
    { id: 'github', kind: 'developer-tools', configured: present(env, 'GITHUB_TOKEN') || present(env, 'GH_TOKEN') }
  ];
}

function safeEnvironmentSummary(env) {
  return {
    compute: computeProviders(env).map(p => ({
      id: p.id, label: p.label, kind: p.kind, configured: p.configured,
      primary: Boolean(p.primary), burst: Boolean(p.burst), isolation: p.isolation, purpose: p.purpose
    })),
    integrations: integrations(env).map(i => ({ id: i.id, kind: i.kind, configured: i.configured }))
  };
}

module.exports = {
  NICKS_STACK_IMAGE,
  AGENT_BLUEPRINTS,
  computeProviders,
  integrations,
  safeEnvironmentSummary
};
