# 03_city-route — StarNet becomes a fleet member

One job: Terabithia routes city missions to StarNet the same way it routes engineering to BARS.

## Inputs
- Working: executiveusa/terabithia `bridge/fleet/{contracts,registry,router,client}.ts`
- Reference: ../_shared/contracts.md §1–§3
- Reference: ../_shared/PRD.md R1, R9

## Process
1. Add `starnet` to `FleetAgentId`, `city` to `FleetRoute`, and `instinct` / `command-center` to `MissionSource`.
2. Register `starnet`: route `city`, runtime env `STARNET_URL`, its own token `STARNET_TOKEN` (no fallback to any other key).
3. Router: `preferred_agent: starnet`, or the words "Heisenberg" / "city" / a district name, route to `city`.
4. The client posts the `MissionEnvelope` to `STARNET_URL/v1/missions` and maps the reply to a `ResultEnvelope`.
5. Tests: routing, token isolation (the BARS token never reaches StarNet), and personal intents never going to `city`.

## Outputs
- output/EVIDENCE.md: PR link, `npm run test:bridge` output, and old-code failures for the new tests.

## Human check
The captain reads the registry entry and confirms StarNet's lane: `city` only, its own token.
