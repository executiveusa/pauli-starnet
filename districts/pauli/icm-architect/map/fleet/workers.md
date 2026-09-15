---
type: fleet-agent
source: fleet-contract
truth_status: contract-node-runtime-requires-receipt
sensitivity: restricted
consumes: [../data/missions.md]
produces: [../data/heartbeats.md, ../data/evidence-receipts.md]
---
# workers
Temporary least-privilege workers. Pauli observes contracts and receipts only; no direct control.
