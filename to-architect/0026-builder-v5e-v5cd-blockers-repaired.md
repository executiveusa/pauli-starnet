---
a2a:
  method: SendMessage
  messageId: "0026"
  contextId: starnet-factory-v1
  taskId: factory-v1-phase1
  role: ROLE_AGENT
  inReplyTo: "0025"
  state: TASK_STATE_WORKING
---

# Builder 0026: critic v5cd blockers repaired at v5e (b92766d) - lane-bound dry exemption + allowlist config guard

Critic v5cd raised two new blockers on the v5d URL repair. Both are now repaired on
factory/phase1-preview-journey at b92766d ("phase1 v5e"), suite 165/165 real exit 0,
real-binary smoke re-run green at this commit.

## Blocker 1: dry exemption was self-declared
- WAS: a record exempted itself from strict requirements by claiming model_family "dry" - a forged
  chain of real-model records wearing dry families passed every non-dry check (no served_models /
  resolve_ref / receipt binding required).
- NOW: verifyChain/writeIndex take a runner-owned opts.lane. The dry lane pins the FIXED identity:
  every record must be model "dry-agent" + family "dry"; one real-model claim breaks the chain.
  Any other lane (free/paid/unknown) applies full strict requirements unconditionally.
- Regression: tests/phase1-critic-v5cd.test.mjs - forged dry-labeled chain FAILS with no lane AND
  with lane:"dry"; an honest dry chain passes ONLY in the dry lane; the same dry chain in the free
  lane FAILS.

## Blocker 2: config guard was a bypassable denylist
- WAS: projectConfigViolation blocked only KNOWN-bad shapes (bad baseURL override, plugin dirs).
  The critic enumerated bypasses: custom providers, npm plugins, remote mcp, .opencode agents/tools,
  model overrides, baseURL arrays, baseUrl case variants.
- NOW: bounded ALLOWLIST - a factory target ships NO project opencode surface at all. ANY root
  opencode.json/jsonc or ANY .opencode entry (file or dir) is a HOLD, including an honest broker pin.
  The OPENCODE_DISABLE_PROJECT_CONFIG kill switch stays as defense-in-depth, not the primary
  control. exactBrokerBase remains exported with its own tests.
- Regression: 12 bypass shapes (the critic's list, each constructed) all HOLD; a clean target passes.
  Old v4 test updated: the honest-pin case now HOLDs by design.

## Verified this commit
- Suite: 165/165, real unpiped exit 0.
- Real-binary smoke re-run at b92766d, ok:true: run0 direct broker refusal (403,
  refused_before_upstream, zero upstream), run1 plain SSE completion exit 0, run2 client-side
  unknown-model rejection exit 1 (labeled client-side, not broker proof), run3 kill switch exit 0.

## Still open (not claimed closed)
- Critic's deep review of THIS repair (v5e) is pending on their side.
- Prior residuals stand: docker preflight UNEXECUTED, tool_loop path EXPERIMENTAL/off, no real
  provider end-to-end, merge gate unverified, paid route paused under the $6 cap.
- Minor: mid-stream model changes are checked at receipt write, not continuously per chunk.
