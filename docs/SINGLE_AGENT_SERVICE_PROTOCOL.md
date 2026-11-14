# One agent, one company: service-agent protocol
This reusable architecture powers THP but contains no THP-only business facts. Implementation seam: workspaces/thp-commercial/agent/dispatch.cjs.

Owner experience: one WhatsApp conversation with Instinct. Hermes/FirstMate dispatches behind it; StarNet runs scoped tasks. No separate CRM interface to learn. Pi remains sealed for personal tasks.

Pipeline: verified WhatsApp Business webhook -> server owner identity and tenant lookup -> policy authorization -> intent/action -> approved facts or tenant-private DB -> idempotent receipt -> answer back on same channel. Apple Messages integration is pending an authorized channel provider.

ICM storage design for a dedicated project: tenants, operator_identities, company_facts, leads, projects, intent_inbox, work_items, approval_requests, action_receipts and agent_events. Every private row scoped by tenant and roles; RLS deny-by-default. One-home-per-fact, immutable events, stage contracts with inputs, outputs and human checks. Tenant ID comes from trusted channel identity, never message text.

Must prove with synthetic data: webhook signature and replay protections; live private DB write/read; cross-tenant denial; human approval before outgoing follow-up; provider send and delivery receipt; bid drawing scan/quarantine; cold walk test; full browser/mobile review. Do not claim these are connected yet.

Reduction: THP public website stays a marketing + bid entry surface; all automation complexity stays in the agent backend. Avoid unverified promises, fabricated SEO numbers, automatic quotes and irreversible tool actions.
