# Kupuri Mission Chain

Status: bounded executable slice

## Purpose

This is the first executable StarNet mission contract for Kupuri. It proves the handoff shape:

`Human -> Hermes -> StarNet policy -> Alex -> Fanni PREPARE -> durable receipt -> human approval queue`

It intentionally stops before publication.

## What is real in this slice

- StarNet validates a mission envelope.
- Hermes is authorized and represented by a routing adapter.
- Alex is authorized only for the owner-facing interface boundary.
- Fanni uses the governed `social.prepare` capability.
- Mission state, PREPARE receipt lineage, and approval queue state are persisted on disk.
- Replayed mission IDs return the original durable state.
- A reused mission ID with different input fails closed.
- Wrong-tenant requests fail closed.

## Adapter boundary

The Hermes, Alex, and Fanni adapter interfaces are executable contracts inside StarNet. They are not claims that an undocumented remote API exists.

Current default transport: `contract`.

External transport wiring must preserve the same return contracts:
- Hermes: `ROUTED`
- Alex: `PRESENTED` with `directInfrastructureAccess: false`
- Fanni: governed `PREPARED` receipt

The existing Hermes gateway/skills and Fanni Node sidecar can be attached behind these adapters when their deployment endpoints and authentication contracts are explicitly verified.

## Hard stop

This slice does not:
- publish social content,
- spend money,
- deploy production,
- grant GitHub write access,
- give Alex infrastructure authority.

Human approval is queued but not executed.
