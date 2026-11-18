# Crypto Cuties District (CUTIES PENTHOUSE) - context routing (Layer 1)

One job: run the Crypto Cuties synthetic creators from their own penthouse rooms, inside their canon.

Where do I go? Work about the Crypto Cuties synthetic creators - Mila (CC-001), Fanni (CC-003), and future cuties - routes through this file. Read on entry to any crypto-cuties seat or task.

Status: PLANNED (declared in registry/districts.json, generated from the CitySpec). The penthouse is where the Cuties operate freely inside StarNet; their canon, identity locks, and production law live in their own repos and win on any conflict.

## Owner-decision log

- 2026-09-18 7:33 PM CST (owner voice note, relayed via main agent): Crypto Cuties get a penthouse district inside StarNet where they operate freely. Config-level city surface change authorized; minimal and reversible.
- 2026-09-18 7:36 PM CST (owner voice note, relayed via main agent): ALL FIVE cuties live in the penthouse, each with her OWN ROOM = her own sandbox.

## Canon sources (win on conflict)

| Entity | Canon home |
|--------|-----------|
| CC-001 Mila | executiveusa/cryptocuties icm/characters/CC-001-MILA/ |
| CC-002 Darya | executiveusa/cryptocuties icm/characters/CC-002-DARYA/ (showrunner) |
| CC-003 Fanni | executiveusa/fanni icm/characters/CC-003-FANNI/ (visual lock LOCKED 2026-09-18) |
| CC-004 | reserved, not locked |
| CC-005 Stephanie Lawson | proposed; lock waits for supplied source image + rights review |
| ICM graph + roster | executiveusa/cryptocuties icm/ |
| Operating boundaries | executiveusa/cryptocuties icm/wiki/operations/BOUNDARIES.md - REFERENCED, never redefined here |

## The five rooms (per-room sandbox semantics)

Each cutie has her own room in the penthouse. A room = her sandbox:

- her own state, memory, and working files (no cross-cutie writes; reads of shared canon only)
- her own seats/slots in the city surface (cityos.js slots: mila, fanni, darya, cc004_reserved, cc005_reserved)
- her own receipts and gauntlet scorecards (per-campaign folders in her canon repo)
- shared penthouse commons: the UGC playbook, JEV learnings/cost model, and the hall-of-canon archive
- a room activates only when that cutie's canon is locked (CC-004/CC-005 stay dark until lock + rights review)

## Buildings

| Building | Role | Slots |
|----------|------|-------|
| CUTIES PENTHOUSE | The Cuties' home: five rooms + commons | mila, fanni, darya, cc004_reserved, cc005_reserved |
| HALL OF CANON (shared, pauli district) | Character/asset archive | curator |

## Boundaries

All operating boundaries come from cryptocuties icm/wiki/operations/BOUNDARIES.md. This file adds none and overrides none. The four owner gates (money, messages to people, publishing, irreversible deletes) apply in full inside this district.

## Agents

Roster: `districts/crypto-cuties/citizens.yaml` (one home per agent; role, status, done-means and judge for each). Each cutie has her own room and sandbox; canon wins on conflict.

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Content draft | draft that passes the cutie's identity lock | owner |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Canon and identity locks in this folder win on any conflict.

## Knowledge

- `districts/crypto-cuties/characters/`
- `districts/crypto-cuties/playbooks/`

## Standing jobs

Each row becomes one Paperclip mission per period for its agent (rows for Instinct or Heisenberg, and anything every 15 minutes or less, run in the gateway instead). With nothing to do, agents sleep.

| When | Job | Agent | Outcome |
|---|---|---|---|
| parked | No schedule while the lane is inactive | none | none |

## Human check

Bambú approves anything a cutie would publish.
