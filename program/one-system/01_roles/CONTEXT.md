# 01_roles — who commands, who may do what

One job: make the command chain explicit in code, so every power and every handover is checkable.

## Inputs
- Reference: ../CONTEXT.md (decisions D1, D2, D11), ../../../docs/DECISIONS.md ("Command chain")
- Code: ../../../gateway/factory/command-chain.js, ../../../gateway/factory/index.js

## Process
1. Roles and powers live in `command-chain.js` (`POWERS`, `OWNER_ONLY`, `can`).
2. Instinct posts `POST /v1/factory/chief/heartbeat` (`{"by":"instinct"}`) at least every minute.
3. `GET /v1/factory/chief` says who is acting chief. Silent for 5 minutes → Heisenberg acts, with Instinct's powers only.
4. Heisenberg's sweep (every 5 minutes): assigned work idle 2 hours → one nudge; idle 6 hours → one escalation.

## Outputs
- output/EVIDENCE.md

## Human check
Bambú reads the powers table in `command-chain.js` and confirms nobody but him can release, overspend or send gated messages.
