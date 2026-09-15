---
type: fleet-agent
source: fleet-contract
truth_status: contract-node-runtime-requires-receipt
sensitivity: shared
consumes: [../data/missions.md]
produces: [../data/heartbeats.md, ../data/evidence-receipts.md]
---
# hermes
Business intent/orchestration. Pauli observes contracts and receipts only; no direct control.
