# Service-company agent scaffold
Command: node scripts/create-service-agent.cjs <tenant-id> <vertical> <company name>
Example: node scripts/create-service-agent.cjs evergreen-hvac hvac "Evergreen HVAC"

Creates a **disabled, private, self-contained ICM workspace** containing an entry, dispatch contract, business facts shelf, tenant configuration and state. It does not create a website, link a phone number, connect a database, change registry privileges, copy THP facts or deploy services. Each company needs an authorized operator, dedicated isolated database, verified messaging number and human signoff.

Owner experience is one chat with a company agent; Starnet handles action logs and worker routing internally. The template is an empty scaffold, not a functioning WhatsApp Business/Apple Messages account.

The existing THP workspace is the reference implementation, but no private THP facts or brand assets are copied. Company design/style must be independently art-directed rather than reproduced.
