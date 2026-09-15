---
type: fleet-agent
source: fleet-contract
truth_status: contract-node-runtime-requires-receipt
sensitivity: shared
consumes: [../data/missions.md]
produces: [../data/heartbeats.md, ../data/evidence-receipts.md]
---
# heisenberg
Mission decomposition/worker coordination. Pauli observes contracts and receipts only; no direct control.
