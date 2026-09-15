---
type: watcher
source: executiveusa/PAULIS-PLACE/backend/agents/watcher_agent.py@328e3aee85126d70658af20fc9cdb238b1524ae8
truth_status: source-proven-runtime-unverified
sensitivity: restricted
consumes: [../data/missions.md, ../data/cost-route-events.md]
produces: [../data/corrections.md]
---
# Legacy WatcherAgent
Actor with task-fail and cost-cancel paths. Pauli audits every proposed or actual effect; it is not treated as advisory-only.
