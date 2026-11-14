---
stage: 03_review_gate
status: blocked
built_by: claude-session-01UT634v
verified_by: ""
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf (this commit)
proof:
  - node test/review-gate.test.js (raw below)
  - a dry-run verdict on live PR #62 from GitHub's real data (raw below; nothing posted)
blocker: "Owner: create a separate reviewer GitHub identity (e.g. an auditor bot account), set the repository variable REVIEW_GATE_REVIEWERS to it, and make the status starnet/review-gate required in branch protection. Today every PR the builder opens is authored by executiveusa, so executiveusa counts as a builder and cannot be its independent reviewer."
---

The gate: `scripts/review/gate-lib.js` (pure verdict), `scripts/review/gate.js` (reads GitHub, posts the commit status
`starnet/review-gate` on the exact head commit), `.github/workflows/review-gate.yml` (runs on PR updates and reviews).

```
$ node test/review-gate.test.js
review-gate.test: OK (17 assertions)
```

Live dry run, PR #62 (reviewers set to executiveusa to show the self-review rule against real data):

```
{
 "verdict": "HOLD",
 "head_sha": "e311611d220415c0c6ecbca78532796848a93289",
 "pr": 62,
 "builders": [
  "claude",
  "executiveusa"
 ],
 "reviewer": null,
 "review_id": null,
 "reasons": [
  "waiting for an independent reviewer to approve e311611"
 ],
 "repo": "executiveusa/pauli-starnet"
}
```

The live run shows the problem the blocker names: the PR author is executiveusa (the builder works through that
account), so an approval from executiveusa can never be independent. The gate holds instead of shipping.

Not proven here: the workflow running on GitHub (it runs once this branch is merged or on its next PR event), a
real SHIP (needs the separate reviewer identity).
