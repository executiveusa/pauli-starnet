'use strict';

function cleanId(value) {
  const id = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!id) throw new Error('NONPROFIT_RUN_REQUIRES_ORG_ID');
  return id;
}

function requireText(value, code) {
  const text = String(value || '').trim();
  if (!text) throw new Error(code);
  return text;
}

function planNonprofitReadinessRun(controlPlane, input) {
  if (!controlPlane || typeof controlPlane.planMission !== 'function') throw new Error('NONPROFIT_RUN_REQUIRES_CONTROL_PLANE');
  input = input || {};

  const lane = controlPlane.getBusinessLane('nonprofit-growth');
  if (!lane) throw new Error('NONPROFIT_GROWTH_LANE_NOT_REGISTERED');

  const organization = {
    id: cleanId(input.organizationId),
    name: requireText(input.organizationName, 'NONPROFIT_RUN_REQUIRES_ORG_NAME'),
    website: requireText(input.website, 'NONPROFIT_RUN_REQUIRES_WEBSITE'),
    type: input.organizationType || 'nonprofit',
    geography: input.geography || null
  };
  const projectId = input.projectId || ('nonprofit-' + organization.id);
  const budgetUsd = Number.isFinite(Number(input.budgetUsd)) ? Number(input.budgetUsd) : 10;

  const definitions = [
    {
      id: 'truth-set',
      agentId: 'heisenberg',
      objective: `Build the current verified truth set for ${organization.name} from ${organization.website}. Separate facts, unknowns, assumptions, legal status, fiscal sponsorship, public claims, and evidence sources. Do not change external systems.`,
      executionLane: 'connector',
      evidence: ['source-ledger', 'truth-table', 'unknowns-list'],
      approval: false
    },
    {
      id: 'funding-readiness',
      agentId: 'heisenberg',
      objective: `Run the nonprofit funding-readiness workflow for ${organization.name}. Score only evidence-backed readiness, identify missing documents and prerequisites, and rank the top five next actions.`,
      executionLane: 'connector',
      evidence: ['readiness-score', 'gap-ledger', 'top-five-actions'],
      approval: false
    },
    {
      id: 'digital-trust',
      agentId: 'max',
      objective: `Audit ${organization.website} and the public digital presence of ${organization.name} for funder due diligence, search visibility, identity consistency, contact paths, accessibility, trust evidence, and conversion friction. No account creation and no production mutation.`,
      executionLane: 'browser',
      evidence: ['url-inventory', 'audit-findings', 'screens-or-dom-receipts'],
      approval: false
    },
    {
      id: 'opportunity-scan',
      agentId: 'heisenberg',
      objective: `Research current grants, sponsorships, partnerships, and mission-aligned funding opportunities for ${organization.name}. Verify eligibility and deadline facts against primary sources before ranking. Do not submit applications or contact funders.`,
      executionLane: 'connector',
      evidence: ['opportunity-ledger', 'primary-source-links', 'eligibility-notes'],
      approval: false
    },
    {
      id: 'reversible-digital-fix',
      agentId: 'max',
      objective: `Choose the highest-impact low-risk digital-trust issue found for ${organization.name} that can be corrected reversibly. Prepare the fix on an isolated branch or equivalent preview, run tests, and produce a reviewable diff. Do not merge to production or publish externally.`,
      executionLane: 'shell',
      evidence: ['branch-or-preview', 'diff', 'test-receipt'],
      approval: false
    },
    {
      id: 'commander-brief',
      agentId: 'heisenberg',
      objective: `Create a concise Commander Brief for ${organization.name}: verified readiness state, five highest-leverage actions, work completed, work blocked, funding opportunities, evidence links, exact human decisions required, and the next autonomous missions.`,
      executionLane: 'connector',
      evidence: ['commander-brief', 'mission-evidence-index'],
      approval: false
    }
  ];

  const missions = definitions.map((definition, index) => {
    const planned = controlPlane.planMission({
      id: `${organization.id}-${String(index + 1).padStart(2, '0')}-${definition.id}`,
      agentId: definition.agentId,
      projectId,
      objective: definition.objective,
      budgetUsd,
      requiresHumanApproval: definition.approval,
      executionLane: definition.executionLane
    });
    return {
      step: index + 1,
      key: definition.id,
      dependsOn: index === 0 ? [] : [definitions[index - 1].id],
      evidenceRequired: definition.evidence.slice(),
      mission: planned.mission,
      plan: planned.plan
    };
  });

  return {
    schema: 'starnet.nonprofit-readiness-run',
    version: 1,
    laneId: lane.id,
    organization,
    projectId,
    mode: 'evidence-first-autonomous-with-human-gates',
    completionRule: 'No step is complete without its required evidence. External publication, account creation, legal attestation, grant submission, borrowing, spending, or production merge requires a separate human-approved mission.',
    missions,
    humanApprovalTriggers: [
      'identity-verification', 'account-creation', 'legal-attestation', 'grant-submission',
      'external-outreach', 'financial-commitment', 'borrowing', 'paid-spend', 'production-merge', 'public-claim'
    ]
  };
}

module.exports = { planNonprofitReadinessRun };
