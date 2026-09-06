# STARNET Sovereign Workforce Architecture

Status: implementation slice on `pauli/sovereign-workforce-fabric-20260906`

## Product thesis

STARNET is the workforce control plane for a one-person company. Command Center remains the owner cockpit. Hermes-compatible operator images are the worker runtime. Computers are replaceable infrastructure supplied by a provider adapter.

The system deliberately separates four layers:

1. **Command Center** — owner view, approvals, priorities, economics, portfolio.
2. **STARNET** — agent registry, mission router, capability/permission policy, evidence, cost, health, computer ownership.
3. **Operator image** — Nick's Stack-inspired Hermes runtime with identity, apps, vault, memory, channels, desktop tools and skills.
4. **Compute fabric** — owned sovereign provider first, local development host second where isolation is not required, Orgo only as optional burst capacity.

No layer is allowed to impersonate another. In particular, Orgo is not the agent and the operator image is not the control plane.

## Locked operator image

The reference operator image is pinned in `sidecar/workforce/operator-image.lock.json`:

- upstream: `nickvasilescu/nicks-stack`
- version: `0.2.2`
- commit: `90b9975c5391591e98565d20d33554a6b91f2f85`
- Orgo template ref: `default/nicks-stack@0.2.2`
- Pauli mirror currently remains at v0.1.1 and is explicitly marked stale until a reviewed sync occurs.

The image represents a persistent worker appliance: Hermes, Telegram, AgentMail, AgentPhone, AgentCard, Composio, 1Password, Obsidian, Latitude, MCP and desktop-control capability. It must remain key-less at build time.

## Five contracts

### Agent

Owns identity of the worker, role, lifecycle class, selected image and references to its computer and identity.

Classes:

- `persistent` — long-lived employee/operator. Requires an isolated computer.
- `mission` — disposable specialist. Ephemeral by default.

### Computer

A provider-neutral record:

- provider
- provider reference
- state
- isolation truth
- ephemeral/durable lifecycle
- attached agent
- image

STARNET does not care whether the implementation is a VM, container-desktop, bare-metal worker or managed provider as long as the provider can honestly satisfy the contract.

### Identity

Contains only identity metadata and **credential references**. It never owns secret values.

Potential identities:

- AgentMail mailbox: agent's own email identity
- AgentPhone: agent's own phone/SMS identity
- Telegram: owner channel
- Composio: delegated access to owner/client apps
- 1Password: secret-plane reference
- AgentCard: bounded spend identity

AgentMail and Gmail/Outlook via Composio are intentionally different concepts: own identity versus delegated account access.

### Mission

A single objective assigned to one agent with:

- project reference
- budget
- approval requirement
- execution lane
- optional computer reference
- lifecycle state

### Evidence

Completion is not model narration. Evidence records source, URI/hash/note and verification state. Production claims should eventually require proof from state/API/DOM/test/screenshot/receipt sources appropriate to the task.

## Execution ladder

STARNET routes work through the fastest deterministic least-privileged method first:

1. `connector`
2. `mcp`
3. `shell`
4. `browser`
5. `desktop`
6. `vision`

A worker must not choose screenshot-driven GUI control when a direct connector, MCP, CLI or CDP route can complete the same objective.

## Compute routing

Default order:

1. **Sovereign provider** — primary owned infrastructure through the stable `/v1/computers` contract.
2. **Local host** — development/attended execution only; never claimed as isolated multi-agent infrastructure.
3. **Orgo** — optional burst provider for disposable or overflow capacity.

Persistent employees fail closed if no isolated provider is configured. They are not silently collapsed onto one shared local host.

### Sovereign compute API contract

The initial adapter expects:

- `POST /v1/computers`
- `GET /v1/computers`
- `GET /v1/computers/:id`
- `POST /v1/computers/:id/start`
- `POST /v1/computers/:id/stop`
- `POST /v1/computers/:id/snapshot`
- `DELETE /v1/computers/:id`

This is intentionally implementation-neutral. A future broker can use Incus/LXD, libvirt/KVM, Docker desktop containers, Proxmox, bare metal, or another substrate without changing Command Center or agent semantics.

### Orgo burst adapter

The Orgo adapter is retained for optional burst capacity and uses the pinned Nick's Stack template for creation. The adapter is never invoked by status or plan calls and tests never create paid resources.

## Persistent operator blueprints

The first reference set is:

- Cosmos — executive orchestrator
- Heisenberg — First Mate
- Max — operations operator
- Fanni — enterprise operator
- Montage — media operator

These are blueprints, not claims that every identity/computer is currently provisioned. `/v1/workforce/status` reports configured versus unconfigured infrastructure honestly.

## First-class business lanes

STARNET can own durable business lanes that are executed by persistent leads plus disposable mission workers. A business lane is not a separate orchestrator or another SaaS product; it is a controlled mission pipeline inside the same workforce operating system.

### Publishing / Books

`publishing-books` is a first-class lane in `sidecar/workforce/catalog.js` and is exposed in `/v1/workforce/status`.

Default lead:

- Heisenberg as persistent coordinating operator

Default worker policy:

- mission workers by default for specialized stages

Pipeline:

1. concept
2. research
3. outline
4. draft
5. fact-check
6. edit
7. design
8. format
9. publish
10. narrate
11. market
12. repurpose

Specialist roles:

- researcher
- writer
- ghostwriter
- editor
- fact-checker
- book designer
- publisher
- narrator
- marketer
- rights reviewer

Supported output classes:

- print-ready PDF
- EPUB
- web book
- interactive flipbook
- Living Edition
- audiobook
- multilingual edition
- social excerpts
- marketing kit

Commercial product forms include memoirs, authority books, children's books, training manuals, impact reports, brand books, white-label publishing and book-to-content subscriptions.

Publishing has explicit approval gates for final manuscript, rights clearance, public release and paid distribution. Evidence requirements include source notes, fact-check receipt, rights review, final artifact hash and publication receipt.

The lane must preserve copyright, provenance and factual-truth requirements. A publication is not “done” because an agent says it is done; it is done only when the final artifact and publication evidence exist.

## Gateway architecture

The existing `gateway/server.js` remains untouched and runs on a loopback-only internal port. `gateway/index.js` starts it and then exposes the public workforce facade on the original gateway port.

Public workforce routes:

- `GET /v1/workforce/status`
- `GET /v1/workforce/agents/:id/plan`
- `POST /v1/workforce/missions/plan`
- `POST /v1/workforce/missions`
- `GET /v1/workforce/missions/:id`

All other routes are proxied to the existing gateway, preserving current Command Center behavior.

A workforce mission is planned before dispatch. If the required computer cannot be proven or human approval is explicitly required, dispatch fails closed.

## Secret plane

Secrets remain outside workforce state.

STARNET may know:

- connector is configured
- vault reference exists
- provider token is present
- mailbox is provisionable

STARNET must not emit:

- API-key values
- passwords
- card numbers
- raw OAuth tokens
- vault contents

The focused test serializes the workforce status snapshot and asserts known injected secret values are absent.

## Environment slots

The branch adds secret-free configuration slots for:

- `STARNET_COMPUTE_URL`
- `STARNET_COMPUTE_TOKEN`
- `ORGO_API_BASE`
- `ORGO_API_KEY`
- `ORGO_WORKSPACE_ID`
- `AGENTMAIL_API_KEY`
- `AGENTPHONE_API_KEY`
- `AGENTCARD_API_KEY`
- `COMPOSIO_CONSUMER_KEY`
- `OP_SERVICE_ACCOUNT_TOKEN`
- `LATITUDE_API_KEY`
- composite gateway ports

Empty values mean not configured. No fake readiness is inferred.

## What is implemented now

- five data contracts
- Nick's Stack source/version lock
- persistent vs mission-worker policy
- identity/integration readiness projection
- sovereign compute adapter contract
- optional Orgo create adapter
- compute-provider ranking
- execution-lane routing
- workforce status and agent planning routes
- workforce mission planning and dispatch into STARNET `/api/run`
- mission status receipts
- compatibility proxy preserving existing gateway routes
- first-class Publishing / Books lane exposed through workforce status
- focused CI gate and syntax checks
- secret-redaction assertions

## What is deliberately not performed automatically

- no AgentMail inbox creation
- no AgentPhone number provisioning
- no AgentCard creation
- no paid Orgo computer creation
- no secret rotation
- no external infrastructure mutation
- no production deployment
- no public book release without explicit approval
- no paid book distribution without explicit approval

Those are irreversible, billable or credential-bearing actions and need explicit provider credentials plus a separate live proof.

## Next proof ladder

1. Focused CI gate green.
2. Start composite gateway against a seeded STARNET workspace.
3. `GET /v1/workforce/status` returns no secrets and exposes `publishing-books`.
4. Plan a shell mission: no computer allocation required.
5. Plan a browser mission: isolated computer required.
6. Configure one test sovereign compute broker and provision one disposable worker.
7. Boot pinned operator image or equivalent sovereign image.
8. Register one AgentMail test inbox with mailbox-scoped credential.
9. Dispatch one read-only mission.
10. Return evidence receipt to Command Center.
11. Destroy disposable computer and prove cleanup.
12. Run one internal publishing proof from source notes to final non-public artifact plus fact-check and artifact-hash evidence.
13. Only after that enable durable employee provisioning or public publishing flows.

## Commercial boundary

This architecture supports a product where a customer buys a managed AI employee rather than a chatbot. A persistent employee can have a name, role, own email, bounded apps, durable memory, computer, schedule, budget, approval rules and audit trail. STARNET is the management system for the fleet; the operator image is replaceable.

Publishing / Books is also a sellable operating lane in its own right: STARNET can run a controlled virtual publishing studio while preserving the same identity, compute, approval, evidence and cost model used by the rest of the workforce.
