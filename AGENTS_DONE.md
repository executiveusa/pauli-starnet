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

---

## 2026-09-18 - Future JEV reference plan: `awesome-jev-by-typesafe`

**Status:** PLAN REFERENCE ONLY. The owner's pause remains in force: do not build, enable, fund, or promote JEV until StarNet is actually working and the owner gives a new go-ahead.

Reference repository:

- <https://github.com/Anil-matcha/awesome-jev-by-typesafe>
- Reviewed snapshot: [`614b1fa35c26815f77f9a9c0be4a21c4eb3ba9b4`](https://github.com/Anil-matcha/awesome-jev-by-typesafe/tree/614b1fa35c26815f77f9a9c0be4a21c4eb3ba9b4)

### ELI5 fit

StarNet already has the JEV socket and OFF switch. This repository is a cookbook, not another engine. Later, use it to choose small questions JEV can answer, decide when low confidence falls back to Hermes, Heisenberg, or a human, and measure whether those answers are actually useful before JEV controls any route.

### What it adds

- reusable typed-decision patterns for `Choice`, `Score`, and `Noul`
- code-owned confidence gates, abstention, and fallback patterns
- agent-harness examples for skill selection, tool routing, command risk, retrieval filtering, diff checks, and model cascades
- an evaluation checklist covering labelled cases, raw probabilities, model versions, latency, false allows, false blocks, escalations, and route cost
- Python and TypeScript starter examples plus a map of outside JEV tools and experiments to inspect selectively

### What it duplicates

The current StarNet JEV seam already asks about worker routing, next action, risk, human approval, and proof sufficiency. Do not add a second control plane, second gateway, or second UI switch. Reuse `window.StarNetJev.decide(state)`, `/api/jev-decision`, the existing OFF state, and `STARNET_JEV_DISABLED=1`.

### What to ignore or treat as unproven

- This is an independent community collection, not an official TypeSafe repository or endorsement.
- Vendor-reported speed, efficiency, limits, prices, and data-handling claims are not StarNet results. Re-check official sources when the pilot restarts.
- Community demos, benchmarks, thresholds, and example policies are leads, not production proof or defaults.
- JEV confidence does not grant authorization. It cannot bypass FirstMate, existing approval rules, human review, or deterministic checks.
- Do not vendor the whole repository or add every listed integration. Pull only the smallest pattern needed for a measured StarNet decision.

### Future shadow-pilot sequence - only after the pause is lifted

1. Confirm StarNet is stable and the owner explicitly unpauses JEV.
2. Re-check the live TypeSafe model, API contract, limits, price, data terms, and gateway route.
3. Start with one reversible decision: recommend a worker for a mission. JEV advises; existing StarNet routing stays authoritative.
4. Log the input state, typed questions, full probability distributions, confidence, versioned model, latency, cost, JEV recommendation, actual route, and outcome.
5. Build labelled replay cases from real StarNet missions, including ambiguous, out-of-domain, and low-confidence inputs.
6. Compare JEV with the existing route on false allows, false blocks, unnecessary escalations, latency, cost, and mission outcome. Do not promote it on confidence alone.
7. If worker routing passes an owner-approved gate, test the existing questions one at a time: skill suggestion, next-action suggestion, proof-sufficiency check, then risk/approval flags. Keep financial, credential, destructive, ownership, DNS, irreversible, and sovereignty-sensitive actions approval-gated.
8. Record any promotion, evidence, thresholds, and rollback here. If results are weak, leave JEV OFF and keep the cookbook only as a reference.

### Proven now vs not proven

**Proven now:** StarNet's existing JEV code is additive and OFF by default; its focused test proved OFF makes zero upstream calls. The reviewed cookbook contains the patterns and examples listed above and labels itself independent. Its current public snapshot is MIT-licensed.

**Not proven now:** no credit-backed live StarNet JEV test, routing accuracy, calibrated threshold, savings, production latency, or operational advantage has been established. The pause stays in force.

---

## 2026-09-19 - JEV shadow mode ACTIVATED (free floor, recommend-only)

**Status change:** the 2026-09-18 pause is LIFTED by explicit owner go-ahead.
Owner evidence: WhatsApp from the owner, received 2026-09-19 2:53 PM CST,
verbatim: "Connect jev and let's test it. We have alot of jev pending logic
already. Connect it and run a free tier test".

What was connected: `sidecar/jev-shadow-openrouter.js` - a shadow decision
plane answering the SAME typed-question contract as
`netlify/functions/jev-decision.mts` (agent / next_action / risk /
requires_human_approval / proof_satisfied), but backed by free-tier
OpenRouter models so the pilot spends $0. Groq was the preferred free lane
per the model-routing rule, but every Groq key on file failed provider
read-back (403) at activation time; OpenRouter free models were verified
live instead.

Shadow contract in force:
- recommend-only: JEV answers typed questions; existing StarNet routing
  stays authoritative; nothing routes on JEV output;
- kill switches armed: STARNET_JEV_DISABLED=1 env (503) and the
  x-starnet-jev-enabled: 1 header gate (409 without it); the UI toggle and
  OFF-by-default behavior are unchanged;
- every decision logged as a receipt (input state, answers, confidence,
  model, latency, token usage, cost_usd=0) to
  registry/jev-shadow-ledger.jsonl on the host;
- no TypeSafe/Netlify AI Gateway credits were added or used; the live
  Netlify URL still 404s (function never deployed there).

First free-tier test (2026-09-19, six real mission states from the day's
actual work): receipts in the ledger; results reported to the owner.

Rollback: `systemctl stop pauli-jev-shadow` (host) and/or set
STARNET_JEV_DISABLED=1; the socket returns to OFF-by-default with zero
upstream calls, as proven by test/jev-control.test.js.

