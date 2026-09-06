'use strict';

const FAST_PATH = Object.freeze(['connector', 'mcp', 'shell', 'browser', 'desktop', 'vision']);

function configured(list, id) {
  return (list || []).find(x => x && x.id === id && x.configured === true) || null;
}

function inferLane(objective, integrations) {
  const q = String(objective || '').toLowerCase();
  const integrationsById = new Map((integrations || []).map(x => [x.id, x]));

  if (/\b(email|mail|inbox|gmail|outlook|calendar|notion|slack|github|repo|pull request|drive)\b/.test(q)) {
    if ((integrationsById.get('composio') || {}).configured || (integrationsById.get('github') || {}).configured) return 'connector';
    return 'mcp';
  }
  if (/\b(git|npm|node|python|docker|build|test|deploy|terminal|command|script|cli)\b/.test(q)) return 'shell';
  if (/\b(browser|website|web page|webpage|form|dashboard|login|chrome)\b/.test(q)) return 'browser';
  if (/\b(desktop|window|application|app|mouse|keyboard)\b/.test(q)) return 'desktop';
  return 'connector';
}

function rankComputeProviders(providers, opts) {
  opts = opts || {};
  const rows = (providers || []).filter(p => p && p.configured === true);
  const scores = rows.map(p => {
    let score = 0;
    if (p.id === 'sovereign') score += 100;
    if (p.id === 'local') score += opts.requiresIsolation ? -100 : 20;
    if (p.id === 'orgo') score += opts.allowBurst ? 50 : -20;
    if (opts.persistent && p.id === 'sovereign') score += 20;
    if (opts.requiresIsolation && p.isolation === 'vm') score += 20;
    if (opts.requiresIsolation && p.isolation === 'none') score -= 200;
    return { provider: p, score };
  });
  scores.sort((a, b) => b.score - a.score || a.provider.id.localeCompare(b.provider.id));
  return scores.filter(x => x.score >= 0).map(x => x.provider);
}

function planComputer(agent, providers, opts) {
  const persistent = agent && agent.class === 'persistent';
  opts = Object.assign({ persistent, requiresIsolation: persistent, allowBurst: true }, opts || {});
  const ranked = rankComputeProviders(providers, opts);
  if (!ranked.length) {
    return {
      ok: false,
      blocker: 'NO_ISOLATED_COMPUTE_PROVIDER',
      note: opts.requiresIsolation
        ? 'No configured provider can prove an isolated computer for this agent.'
        : 'No configured compute provider is available.'
    };
  }
  const provider = ranked[0];
  return {
    ok: true,
    provider: provider.id,
    isolated: provider.isolation !== 'none',
    image: agent.image || 'nicks-stack',
    ephemeral: agent.class !== 'persistent',
    fallbackProviders: ranked.slice(1).map(p => p.id)
  };
}

function planMission(mission, integrations, providers, agent) {
  const lane = mission.executionLane || inferLane(mission.objective, integrations);
  const laneIndex = FAST_PATH.indexOf(lane);
  const computerNeeded = laneIndex >= FAST_PATH.indexOf('browser');
  const computer = computerNeeded ? planComputer(agent, providers, {
    requiresIsolation: agent && agent.class === 'persistent',
    allowBurst: true
  }) : { ok: true, provider: null, isolated: false, ephemeral: false, fallbackProviders: [] };

  return {
    ok: computer.ok,
    missionId: mission.id,
    agentId: mission.agentId,
    executionLane: lane,
    fallbackLanes: FAST_PATH.slice(Math.max(0, laneIndex + 1)),
    computerRequired: computerNeeded,
    computer,
    approvalRequired: mission.requiresHumanApproval === true,
    rule: 'fastest-deterministic-least-privileged-first'
  };
}

module.exports = { FAST_PATH, inferLane, rankComputeProviders, planComputer, planMission, configured };
