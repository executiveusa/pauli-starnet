# AGENTS_DONE.md

Durable completion notes for agents working on StarNet. Read this file before declaring related work complete.

---

## 2026-09-17 — Jev optional decision control plane

**Status:** CODED + MERGED. Jev is intentionally **OFF by default** until the owner adds Netlify AI credits and explicitly enables it.

### What changed

StarNet now contains an optional TypeSafe AI **Jev / System-One** decision layer. It does **not** replace Hermes, Heisenberg, the existing provider/model router, FirstMate policy, or human authority.

Jev is intended for small typed control decisions such as:

- worker / agent routing
- next-action selection
- operational risk scoring
- whether human approval is required
- whether supplied proof is sufficient

Primary implementation:

- `frontend/app/jev-control.js` — persistent JEV ON/OFF + TEST control
- `netlify/functions/jev-decision.mts` — Netlify serverless gateway to Jev
- `sidecar/jev-client.js` — local/desktop adapter
- `sidecar/index.js` — same-origin `POST /api/jev-decision` proxy
- `test/jev-control.test.js` — proves OFF means zero upstream calls
- `npm run test:jev` — focused Jev control-plane test

Merged by PR #26. Original Jev merge commit: `9445cea2320f3efbf5c41ca135b5662a272b6939`.

### Safety model

```text
JEV OFF
  -> local bypass
  -> zero Jev network calls
  -> existing StarNet behavior remains authoritative

JEV ON
  -> StarNet /api/jev-decision
  -> Netlify Function
  -> Netlify AI Gateway / TypeSafe Jev
  -> typed decision returned
  -> existing StarNet policy / approval boundaries still apply
```

Jev must **never** independently authorize destructive, financial, credential, ownership, DNS, irreversible, or sovereignty-sensitive actions. Existing FirstMate/policy/human approval remains above Jev.

Emergency host kill switch:

```bash
STARNET_JEV_DISABLED=1
```

### How the owner uses it later

1. Add/confirm **Netlify AI Gateway credits** for the `pauli-starnet-city` project.
2. Open StarNet.
3. Find the **JEV** control in the interface.
4. Switch **ENABLE** on.
5. Press **TEST**.
6. Confirm the status reports ready and inspect the Jev decision result.
7. Keep Jev in bounded/shadow use until enough real routing decisions have been measured.
8. Turn it OFF at any time to return to the existing StarNet path with zero Jev calls.

Programmatic seam for future agents:

```js
window.StarNetJev.isEnabled()
window.StarNetJev.setEnabled(true)
await window.StarNetJev.decide(state)
window.StarNetJev.test()
```

Do not route production authority to Jev merely because it returns high confidence.

### Proof already completed

- focused Jev OFF/ON/hard-kill test passed
- OFF state verified to make zero upstream requests
- repository `eval-gates` passed after cleanup
- full-history `secret-history` / Gitleaks passed after cleanup
- historical Gitleaks finding was confirmed as a synthetic localhost-only mock token, not a live credential
- cleanup merged via PR #27

### USER REMINDER — INSTALL / ACTIVATE LATER

> **OWNER TODO:** When Netlify credits are added, install/activate the usable Jev path by opening StarNet, switching **JEV ENABLE** on, and running **TEST**. Until then, leave JEV OFF.

Do not mark the Jev integration as production-proven until that live credit-backed TEST succeeds.

### Agent reminder

If a future task touches routing, FirstMate, Heisenberg, Hermes orchestration, model selection, or control-plane policy:

1. inspect this Jev seam before creating another routing system;
2. reuse it instead of duplicating decision infrastructure when appropriate;
3. preserve the OFF switch and host kill switch;
4. preserve human authority boundaries;
5. record any promotion from shadow/advisory mode to live routing here with evidence and rollback instructions.
