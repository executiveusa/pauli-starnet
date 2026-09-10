'use strict';

const CITY_DISTRICTS = [
  { id: 'bridge', name: 'The Bridge', purpose: 'Owner intent, priorities, approvals, city health, and executive decisions.', aliases: ['bridge', 'command', 'city center'], owner: 'Hermes / Cosmos + Heisenberg', capabilities: ['command', 'approvals', 'priorities', 'city-health', 'executive-routing'] },
  { id: 'foundry', name: 'The Foundry', purpose: 'Software, websites, apps, QA, repairs, deployments, and the Lovable production line.', aliases: ['foundry', 'engineering', 'software factory'], owner: 'Orca + STARNET workers', capabilities: ['software', 'qa', 'deployments', 'repo-repair', 'lovable'] },
  { id: 'press', name: 'The Press', purpose: 'Books, Living Editions, publishing, comics, EPUB/PDF/audio, and licensing.', aliases: ['press', 'publishing'], capabilities: ['publishing', 'books', 'living-editions', 'rights', 'licensing'] },
  { id: 'studio', name: 'The Studio', purpose: 'Video, audio, voice, design, campaign assets, and media production.', aliases: ['studio', 'media'], owner: 'MONTAGE + BARS + Darya', capabilities: ['video', 'audio', 'voice', 'design', 'media-assets'] },
  { id: 'market', name: 'The Market', purpose: 'Commerce, stores, products, Fashion & Merch, Printify, fulfillment, and licensing.', aliases: ['market', 'commerce', 'fashion', 'fashion & merch', 'ecommerce', 'e-commerce'], capabilities: ['printify', 'pod', 'catalog', 'storefronts', 'fulfillment', 'fashion-merch'] },
  { id: 'signal', name: 'Signal', purpose: 'Research, demand intelligence, SEO, social listening, prospecting, and campaign measurement.', aliases: ['signal', 'growth', 'research'], owner: 'Fanni where scoped + research specialists', capabilities: ['research', 'seo', 'listening', 'prospecting', 'campaign-intelligence'] },
  { id: 'exchange', name: 'The Exchange', purpose: 'Affiliates, referrals, partnerships, solution-partner programs, and distribution economics.', aliases: ['exchange', 'affiliates', 'partnerships'], capabilities: ['affiliate', 'referrals', 'partners', 'distribution'] },
  { id: 'treasury', name: 'The Treasury', purpose: 'Verified revenue/cost truth, AP/AR, renewals, budgets, obligations, and economics.', aliases: ['treasury', 'finance', 'financial'], capabilities: ['economics', 'ap-ar', 'budgets', 'renewals', 'financial-reporting'] },
  { id: 'harbor', name: 'The Harbor', purpose: 'Hostinger, cloud/local compute, provisioning, worker health, and teardown.', aliases: ['harbor', 'compute', 'infrastructure'], capabilities: ['compute', 'provisioning', 'hostinger', 'worker-health', 'teardown'] },
  { id: 'vault', name: 'The Vault', purpose: 'Secrets, identities, delegated permissions, budgets, trust boundaries, and kill switches.', aliases: ['vault', 'identity', 'security', 'trust'], capabilities: ['secrets', 'identity', 'permissions', 'budgets', 'kill-switches'] },
  { id: 'archive', name: 'The Archive', purpose: 'Evidence, memory, project history, retrieval, and durable knowledge.', aliases: ['archive', 'memory', 'evidence'], owner: 'Jarvis + Terabithia + ICM', capabilities: ['memory', 'evidence', 'history', 'retrieval', 'knowledge'] },
  { id: 'academy', name: 'The Academy', purpose: 'Skills, training, education, agent onboarding, and reusable operating doctrine.', aliases: ['academy', 'learning', 'education'], capabilities: ['skills', 'training', 'education', 'onboarding'] },
  { id: 'lab', name: 'The Lab', purpose: 'Controlled experiments for models, prompts, offers, funnels, UX, and workflows.', aliases: ['lab', 'experiments', 'research lab'], capabilities: ['experiments', 'evaluation', 'ab-testing', 'optimization'] },
  { id: 'commons', name: 'The Commons', purpose: 'Future STARNET-to-STARNET federation, visiting agents, and scoped shared missions.', aliases: ['commons', 'federation', 'multiplayer'], capabilities: ['federation', 'a2a', 'presence', 'shared-missions'] },
  { id: 'impact', name: 'Impact District', purpose: 'Nonprofits, grants, funders, donor research, programs, and verified impact evidence.', aliases: ['impact', 'impact district', 'impact office', 'the impact office', 'nonprofit', 'non-profit'], owner: 'Indigo + Grant Agent', capabilities: ['grants', 'funders', 'nonprofits', 'donor-research', 'program-evidence', 'impact-reporting'] }
];

const COMPANY_SPACES = [
  { id: 'max-digital-media', name: 'Max Digital Media', primaryOperator: 'Agent Max', homeDistricts: ['foundry', 'studio', 'market', 'signal', 'treasury', 'vault'], notes: 'Sports/coaches/schools, client operations, software, content, commerce, and verified offers.' },
  { id: 'postatees', name: 'Postatees', homeDistricts: ['market', 'studio', 'signal', 'treasury', 'exchange', 'foundry'], notes: 'Separate catalog, design rights, ecommerce/Printify, fulfillment economics, and approvals.' },
  { id: 'kupuri-media-mexico', name: 'Kupuri Media Mexico', primaryOperator: 'Fanni', homeDistricts: ['signal', 'studio', 'market', 'treasury', 'vault', 'foundry'], notes: 'Spanish-first/WhatsApp-first media intelligence and client operations in Mexico.' }
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function canonicalDistrictId(value) {
  const needle = normalize(value);
  if (!needle) return undefined;
  const match = CITY_DISTRICTS.find(district =>
    [district.id, district.name].concat(district.aliases || []).some(candidate => normalize(candidate) === needle)
  );
  return match && match.id;
}

function projectDistricts(runtimeDistricts, citizens, missions) {
  const runtimeById = new Map();
  for (const runtime of Array.isArray(runtimeDistricts) ? runtimeDistricts : []) {
    const id = canonicalDistrictId(runtime && (runtime.id || runtime.name));
    if (id) runtimeById.set(id, runtime);
  }

  const allCitizens = Array.isArray(citizens) ? citizens : [];
  const allMissions = Array.isArray(missions) ? missions : [];
  return CITY_DISTRICTS.map(manifest => {
    const runtime = runtimeById.get(manifest.id) || {};
    const districtCitizens = allCitizens.filter(citizen => canonicalDistrictId(citizen && citizen.district) === manifest.id);
    const districtMissions = allMissions.filter(mission => canonicalDistrictId(mission && mission.district) === manifest.id);
    const activeMissions = districtMissions.filter(mission => ['running', 'queued', 'planning', 'working', 'recovering'].includes(normalize(mission && mission.status)));
    const activeCitizens = districtCitizens.filter(citizen => ['online', 'active', 'working', 'busy'].includes(normalize(citizen && citizen.status)));
    const runtimeActive = Number(runtime.active);
    const runtimeAgents = Number(runtime.agents);
    const active = Number.isFinite(runtimeActive) ? runtimeActive : Math.max(activeCitizens.length, activeMissions.length);
    const agents = Number.isFinite(runtimeAgents) ? runtimeAgents : districtCitizens.length;

    return Object.assign({}, runtime, {
      id: manifest.id,
      name: manifest.name,
      purpose: manifest.purpose,
      owner: manifest.owner,
      capabilities: manifest.capabilities,
      agents,
      active,
      status: runtime.status || (active > 0 ? 'active' : 'ready'),
      revenue: runtime.revenue === undefined ? null : runtime.revenue,
      cost: runtime.cost === undefined ? null : runtime.cost
    });
  });
}

module.exports = {
  CITY_ARCHITECTURE_VERSION: 1,
  CITY_DISTRICTS,
  COMPANY_SPACES,
  canonicalDistrictId,
  projectDistricts
};
