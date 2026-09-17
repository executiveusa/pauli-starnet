# Commerce work evidence

The city moves Commerce agents only while a real task is running. Authenticated workers
can bracket research, design drafting, listing preparation, connector checks, and unit-
economics work with `POST /v1/commerce/evidence` or `scripts/commerce-evidence.mjs`.

`start` records a running task and a gateway receipt. `settle` records completed or failed
state and a second receipt. Both flow through the existing sanitized city DTO, so public
visitors see only a coarse category, agent name, relative age, state, and receipt presence.
Full task text and internal receipt IDs never reach the public surface.

This is intentionally not a heartbeat or animation loop. Idle means no evidenced work.
Continuous movement therefore requires continuous real queued work. Arming an unattended
model-backed loop can spend provider money and remains separately approval-gated.
