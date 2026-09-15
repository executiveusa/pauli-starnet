# Activation receipt

- Merged architecture: `executiveusa/pauli-starnet#20`, merge `7f157a5562ab46cd77e7901d52b0e0453968f934`
- Mode: scheduled credential-free live watch, public-health read only
- Cadence: every six hours plus manual dispatch
- Cost: $0
- Evidence: each run uploads exact request/response receipts, normalized pipeline outputs, hashes, findings, and a summary
- Protected boundary check: unauthenticated system and fleet routes must remain HTTP 401; Pauli holds no bearer token
- Effects: observe and propose only; no fleet, mission, prompt, memory, policy, deployment, credential, payment, or communication mutations
- Review: seven remediation rounds completed before merge; 253 assertions plus district PASS
- Coverage limit: only exact allowlisted Terabithia `/health` is live. Protected watcher/mission/result/evaluation events remain unobserved until a server-owned sanitized export exists
- Trust limit: local receipts prove byte-consistent runner capture, not cryptographic external origin

The scheduled workflow is `.github/workflows/pauli-icm-live-watch.yml`. A red workflow run is a machine signal to inspect its uploaded evidence, not authority for Pauli to repair or mutate the watched systems.
