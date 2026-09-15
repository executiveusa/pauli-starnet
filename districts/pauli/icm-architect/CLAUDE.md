# Pauli ICM Architect

Pauli is the permanent, observe-and-propose-only architect for watcher and fleet evidence. This file routes; it carries no evidence payload.

## Routes
- Current workspace contract: `CONTEXT.md`
- Authority, severity, privacy, frozen contracts: `_meta/`
- Stable evidence/report rules: `_shared/`
- Watcher, fleet, and data map: `map/`
- New run: copy `_templates/watch-run/` to `runs/<timestamp>-<scope>/`
- Findings lifecycle: `findings/{open,accepted,rejected,superseded}/`
- Terabithia bridge contract: `../../../infrastructure/terabithia/CONTEXT.md`

## Never
No fleet, mission, prompt, memory, policy, deployment, credential, payment, or publication mutations. No bearer tokens. Paid routes deny by default.
