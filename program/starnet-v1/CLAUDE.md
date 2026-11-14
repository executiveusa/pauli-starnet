# StarNet v1 program — entry

You are in the build program for StarNet v1. Captain: Bambú. It covers 8 repos; this folder is the one plan.

**Goal:** the captain speaks to Instinct, Heisenberg runs the work with a real crew, and the answer comes back with a receipt that anyone can check.

## Where things live

| Need | Go to |
|---|---|
| What we are building and why | `_shared/PRD.md` |
| Exact message shapes (intent, mission, receipt, evidence) | `_shared/contracts.md` |
| The stage order and the status rule | `CONTEXT.md` |
| Current status | run `node program/starnet-v1/_system/status.mjs` (never hand-edit status) |
| The work itself | `01_truth/` … `06_proof-run/` (each has a `CONTEXT.md` contract) |

## Rules for any agent working here

1. Read `CONTEXT.md`, then only the contract of the stage you work on and the inputs it names.
2. Verify It Before Everything: a stage is done only when its `output/EVIDENCE.md` holds proof a stranger can check.
3. The builder never marks its own work verified. `verified_by` must be a different agent or the captain.
4. No secret values in any file. Name the variable, never its value.
5. Consequential actions (money, publish, deploy to production, delete, contact a real person) wait for the captain.
6. If the files and the code disagree, the code wins; fix the file in the same change.
