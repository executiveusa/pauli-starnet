# StarNet Master Architecture

Status: CANONICAL-DRAFT
Scope: governance and composition only
Runtime behavior changed: NO

## Purpose

StarNet is the reusable operating environment for agentic businesses and projects. Hermes is the orchestration intelligence. Tenant implementations such as Kupuri Agent City configure StarNet; they do not become the global platform root.

## Laws

1. Verify before claiming.
2. Reuse before adding.
3. Product repositories remain independent and connect through versioned contracts.
4. Avatars never receive direct infrastructure authority; actions pass through governed capabilities.
5. Every privileged action must identify tenant, actor, capability, approval state, cost boundary, and durable receipt.
6. No release is considered verified without evidence tied to the candidate commit.
7. Registry state is descriptive until runtime enforcement exists.

## Layers

Human Owner
  -> Approval Layer
  -> Hermes + StarNet
  -> ICM control plane
  -> tenants / districts / capabilities / receipts
  -> product nodes and external systems

### Shared platform

- `executiveusa/pauli-starnet`: reusable visual/runtime platform.
- `executiveusa/pauli-hermes-agent`: orchestrator and skill consumer.

### Tenant implementation

- `executiveusa/kupuri-agent-city`: Kupuri-specific control-plane implementation and first major tenant reference.

### Creative/avatar capability

- `executiveusa/Synthia-avatar`: current canonical Alex visual/avatar source subject to license/provenance verification before broader commercial reuse.
- StarNet Creative District / Avatar World Builder: reusable composition layer; do not duplicate Alex assets across product repositories.

## Lego model

Primitive -> Skill -> Agent -> District -> Tenant StarNet

A primitive is a connector/tool/asset/runtime capability. A skill wraps primitives with instructions and contracts. An agent receives bounded skills and permissions. A district groups agents around one business responsibility. A tenant StarNet assembles districts without copying product code.

## Canonical districts

- `casa-central`: owner-facing coordination, approvals, mission state.
- `creative`: brand, image, video, audio, avatar/world building.
- `factory`: software build/review/release.
- `social`: research, preparation, scheduling and governed publishing.
- `commerce`: lead/revenue operations with evidence receipts.

Additional districts require registry entry and explicit capability boundaries.

## Contract set

The platform will converge on six versioned contracts:

- TenantContract
- AgentContract
- SkillContract
- CapabilityContract
- DistrictContract
- ProductContract

The registry in `/registry` is the canonical human/agent-readable inventory until machine schemas are introduced.

## Gateway rule

Bad: avatar -> GitHub/social/database/deployment directly.

Required: avatar/agent -> Hermes/mission -> gateway/capability check -> external system -> receipt.

Gateway decision inputs must include tenant, actor, requested capability, target resource, approval state, replay/expiry state and spend boundary.

## Tenant isolation

Each tenant owns distinct memory, approvals, connector grants, product contracts and deployment records. Cross-tenant reads/writes are denied unless an explicit scoped grant exists.

## Product repository rule

Do not create a mega-monorepo for customer/product code. StarNet stores references and contracts; product repositories remain independently deployable and rollback-capable.

## Current three workstreams

1. REVENUE: Kupuri/Ivette tenant vertical slice.
2. SHARED PLATFORM: StarNet + Hermes registry/contracts required by that slice.
3. BOUNDED EXPERIMENT: Avatar Foundry proving Alex plus one second avatar from the same manifest model.

Anything else is PARKED unless it replaces one of these workstreams.

## First vertical slice acceptance test

Human/Instinct request -> Hermes -> StarNet -> tenant gateway -> Alex -> Fanni prepare action -> human approval -> durable receipt.

Initial slice MUST NOT autonomously publish, spend money, deploy production, or perform destructive GitHub writes.

Failure tests must include wrong tenant, wrong actor, expired grant, missing approval, replayed mission, direct-avatar bypass, revoked connector and cross-tenant memory access.

## Release evidence

A release receipt should bind:

- commit SHA
- test suite/results
- security scan result
- deployment identifier
- tenant
- actor
- approval
- rollback target
- timestamp

## Phase 0/1 boundary

This architecture and the adjacent registry are additive documentation only. They do not grant permissions, connect accounts, rotate credentials, modify deployments, publish social content or alter runtime behavior.
