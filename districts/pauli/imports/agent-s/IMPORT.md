# IMPORT SPEC - pauli-agent-S-computer-use- (GUI-driving adapter, LATER PHASE)
Source: executiveusa/pauli-agent-S-computer-use- @ bffdb59c60cbbb38c3a190b2e91da12039e4063c (main)
Upstream: simular-ai/Agent-S | License: Apache-2.0 (LICENSE-UPSTREAM retained; NOTICE rules apply)

## Take (file-pinned at source SHA)
- `gui_agents/s1/aci/` (ACI.py, LinuxOSACI.py, MacOSACI.py, WindowsOSACI.py) - the OS abstraction layer: how Agent-S drives real desktops per-OS.
- `gui_agents/s1/core/` (Manager.py, Knowledge.py) - grounding + knowledge loop.
- `evaluation_sets/` - OSWorld-style eval shape for GUI tasks.

## Destination
- Pauli's eventual computer: Agent-S runs as a SEPARATE PROCESS behind a ComputerProvider interface (copyleft-clean boundary, attribution intact). Providers: isolated VPS workspaces first, RunPod for GPU, Orgo only if a second free slot exists. NOT this phase: this spec + license retention only; the adapter build is its own gated chunk.

## Tests
- Later chunk: ComputerProvider contract test + one seeded GUI eval from evaluation_sets/test_small_new.json.

## Archive credit
Spec counts as the import record NOW; archive-eligibility waits for the adapter chunk (repo still referenced live).
