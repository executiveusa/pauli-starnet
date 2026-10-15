# 04_foreman — Heisenberg runs a real crew

One job: a city mission makes Heisenberg dispatch at least two native crew members and return a merged result.

## Inputs
- Working: executiveusa/pauli-starnet `gateway/server.js` + `gateway/missions.js`, `sidecar/permissions.js` (consent broker), `sidecar/index.js` (runOnce, the new mission route), roster (agent `agent` = HEISENBERG)
- Reference: ../_shared/contracts.md §2–§3
- Reference: ../_shared/PRD.md §5 steps 3–5, R2–R5
- Reference: `sidecar/capability/registry.js:229-237` (the orchestrator tools), `shared/specialties.js:338` (foreman)

## Process
1. Gateway: `POST /v1/missions` validates the envelope (GREEN + route `city` only) and persists the task to disk. Restart marks in-flight tasks `failed: interrupted`.
2. Sidecar: a loopback, token-checked mission route starts a Heisenberg run (surface `autonomous`, orchestrator placed, grant `crew`).
3. Add a `crew` tier to the consent broker: it unlocks a blocking `team.dispatch` only (never `background: true`, since the mission must wait for its crew). It is set as a host-only run option by that route alone, and never from a body, a stored job, a prompt or tool text.
4. Return the `ResultEnvelope` with `crew[]` and evidence refs. Report solo work as solo.
5. Tests: two crew tasks from a stubbed provider; `team.summon` denied; `crew` can't be minted through `/api/run` body fields; restart recovery.

## Outputs
- output/EVIDENCE.md: PR link, test output, and old-code failures.

## Human check
The captain watches one local run in the city view and sees Heisenberg plus crew bodies move only while their tasks run.
