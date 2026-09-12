# beads_rust task DAG for Heisenberg (ADOPTED 2026-09-12, scratch-proven)

[beads_rust](https://github.com/Dicklesworthstone/beads_rust) v0.6.0 - a
single-binary, SQLite + JSONL task DAG ("agent-first issue tracker").
Heisenberg's mission-decomposition and bottleneck-triage layer.
[beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) (`bv`) is
the optional TUI on top of the same `.beads/issues.jsonl` data.

Same MIT + rider license note as the comms fabric: own-fleet use is fine,
client resale needs a per-repo check.

## Scratch proof (this sandbox, 2026-09-12)

Downloaded the linux_amd64 release binary, verified the published SHA-256
before running (f6f9a166...829b, matched). Then built a real revenue-lane
mission DAG:

```
br init
br q "Scan Reddit for Etsy printable demand"     -> demo-3d4
br q "Draft 3 printable product concepts"        -> demo-hbw (dep: 3d4)
br q "Design gate: Darya/Synthia review"         -> demo-99h (dep: hbw)
br q "Build Etsy listing draft"                  -> demo-zm1 (dep: 99h)
br q "Owner approval gate: publish listing"      -> demo-jrn (dep: zm1)
```

`br ready` showed only the first task; `br blocked` showed the other four
with their exact blockers. After `br close demo-3d4`, ready advanced to the
next task. `br scheduler` ranked ready work with explainable evidence
(priority +20, dependents +3, fairness +3, domain +6). `br doctor` passed
integrity checks (DB/JSONL in sync, write probe, sqlite integrity).

## How Heisenberg uses it

1. Mission intake: decompose into `br` issues with dependencies (gates are
   issues too - design gates and owner approval gates stay visible in the DAG).
2. Worker dispatch: `br ready` is the only queue workers pull from; blocked
   work stays parked with its blocker named.
3. Triage: `br blocked` + `br scheduler` give the foreman the bottleneck list
   with reasons, not vibes.
4. Receipts: issue close + comments carry the evidence links; the JSONL file
   diffs cleanly in git.

## Install (no curl|bash)

Fetch the release tarball, verify SHA-256 against the published
`.sha256` (and minisig when minisign is available), drop `br` in
/usr/local/bin. The mcp_agent_mail one-line installer also installs `br`
but replaces `bd` and edits shell profiles - do not use it on the VPS.
