---
type: watcher
source: executiveusa/pauli-starnet/frontend/app/cityos.js@826636afd019db686c8700f57aeb6d2ee0cde474
truth_status: desired-slot-unseated
sensitivity: shared
consumes: [../data/heartbeats.md]
produces: [../data/corrections.md]
---
# Nightwatch
A desired Operations/Night Operations slot. Never report it as running without a current runtime receipt.
