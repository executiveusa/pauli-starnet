# Gates: one-system finish, review and merge

Scope: Stage 1: the independent Claude review passes and both PRs are merged. Read-only GitHub checks; nothing here touches a server. Ledger format: Leonxlnx/unlazy (MIT). Copy to /opt/starnet/one-system/.finish/1-review-and-merge.md and run the checker on this file only.

- [ ] G1: the Claude Review workflow is on the default branch (PR 110 merged)
  CHECK: gh pr view 110 -R executiveusa/pauli-starnet --json state -q .state
  EXPECT: /^MERGED\s*$/
  EVIDENCE: pending

- [ ] G2: a reviewer credential is a repository secret (value never shown): OPENROUTER_API_KEY for the free reviewer (owner decision 2026-11-17, #111) or CLAUDE_CODE_OAUTH_TOKEN for Claude Review; that it works is proven by G5
  CHECK: gh secret list -R executiveusa/pauli-starnet
  EXPECT: /^(OPENROUTER_API_KEY|CLAUDE_CODE_OAUTH_TOKEN)\s/m
  EVIDENCE: pending

- [ ] G3: the review gate counts the review workflows (Free Review or Claude Review, both post as github-actions[bot]) as the reviewer
  CHECK: gh variable get REVIEW_GATE_REVIEWERS -R executiveusa/pauli-starnet
  EXPECT: /^github-actions\[bot\]\s*$/
  EVIDENCE: pending

- [ ] G4: GitHub Actions may approve pull requests in this repository
  CHECK: gh api repos/executiveusa/pauli-starnet/actions/permissions/workflow -q .can_approve_pull_request_reviews
  EXPECT: /^true\s*$/
  EVIDENCE: pending

- [ ] G5: the review gate says SHIP on PR 109's head commit (independent Claude review approved that exact commit)
  CHECK: bash -c 'sha=$(gh pr view 109 -R executiveusa/pauli-starnet --json headRefOid -q .headRefOid) && gh api "repos/executiveusa/pauli-starnet/commits/$sha/status" -q ".statuses[] | select(.context==\"starnet/review-gate\") | .state"'
  EXPECT: /^success\s*$/
  EVIDENCE: pending

- [ ] G6: Bambú was told what each merge releases (Vercel production branch of pauli-starnet, starnet-paulis-place-gateway and pauli-command-center) and said merge
  EVIDENCE: pending

- [ ] G7: PR 109 merged
  CHECK: gh pr view 109 -R executiveusa/pauli-starnet --json state -q .state
  EXPECT: /^MERGED\s*$/
  EVIDENCE: pending

- [ ] G8: Command Center PR 45 merged
  CHECK: gh pr view 45 -R executiveusa/pauli-command-center --json state -q .state
  EXPECT: /^MERGED\s*$/
  EVIDENCE: pending
