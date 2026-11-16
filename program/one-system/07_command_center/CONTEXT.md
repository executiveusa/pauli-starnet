# 07_command_center — steer the whole system from a phone

One job: the owner sees the command chain, districts, agents and missions, and can task, pause, approve and stop
from `/starnet/control` in executiveusa/pauli-command-center.

## Inputs
- Code (StarNet): ../../../gateway/factory/index.js (`/v1/factory/agents`, `/v1/factory/agents/<id>/task`, pipelines, chief)
- Code (Command Center): `src/lib/factory-control-plane.ts`, `src/app/api/starnet/control/route.ts`, `src/app/starnet/control/page.tsx`

## Process
Owner session only; own credential; allowlisted actions; nulls when a source is down; typed STOP for the emergency stop.

## Outputs
- output/EVIDENCE.md

## Human check
Live test L6 to L8 in `../08_activation/HANDOFF.md`, on a phone.
