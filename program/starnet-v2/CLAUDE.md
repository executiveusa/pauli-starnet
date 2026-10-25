# StarNet v2 program: entry

You are in the build program for StarNet v2. Captain: Bambú. Architect: the Claude Code session. Builder: Instinct (server side).

**Goal:** the city runs on the captain's VPS, Heisenberg manages every district, agents are visibly working in the city view,
the software factory turns up to 5 repos a day into ~80%-done deployed products, and the captain runs it all by voice through Instinct.

## Where things live
| Need | Go to |
|---|---|
| What we are building and why (the grilled decisions D1-D17) | `_shared/PRD.md` |
| The stage order, AI-time sizing and the status rule | `CONTEXT.md` |
| Done-for-you Kindle publishing workflow (revenue offer) | `_shared/workflows/kindle-done-for-you.md` |
| Current status | `node program/starnet-v2/_system/status.mjs` (never hand-edit status) |
| v1 (golden mission) | `../starnet-v1/`: its stages 02-05 are *claimed*, so v2 stage `00_verify-v1` closes them |

## Rules for any agent working here
1. Read `CONTEXT.md`, then only the stage contract you work on.
2. A stage is done only when `NN_*/output/EVIDENCE.md` holds proof a stranger can check, and `verified_by` differs from `built_by`.
3. Builder, judge and security auditor are three different voices (different model families).
4. No secret values anywhere. Name the variable, never its value.
5. Red actions wait for the captain: money, pricing, contacting people, public publishing or go-live, deletion, anything irreversible.
6. Time is AI time: size work in sessions, hours and tokens, never days or weeks.
7. Everything follows ICM (Jake Van Clief): any agent pointed at a folder must pass the walk test.
