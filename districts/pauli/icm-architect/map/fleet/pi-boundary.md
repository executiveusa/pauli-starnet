---
type: fleet-agent
source: fleet-contract
truth_status: contract-node-runtime-requires-receipt
sensitivity: private
consumes: [../data/missions.md]
produces: [../data/heartbeats.md, ../data/evidence-receipts.md]
---
# pi-boundary
Private Human OS boundary. Pauli observes contracts and receipts only; no direct control.
