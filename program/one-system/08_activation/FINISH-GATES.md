# Gates: one-system finish (merge, go live, prove it)

Scope: both PRs merged after an independent Claude review, StarNet and the Command Center live on thepaulieffect.com, live tests L1 to L10 recorded with evidence, and the evidence reviewed. Ledger format: Leonxlnx/unlazy (MIT), templates/gates-leaf.md. Copy this file to /opt/starnet/one-system/GATES.md on the server; run every check from there.

- [ ] G1: the Claude Review workflow is on the default branch (PR 110 merged)
  CHECK: gh pr view 110 -R executiveusa/pauli-starnet --json state -q .state
  EXPECT: /^MERGED\s*$/
  EVIDENCE: pending

- [ ] G2: the Claude subscription token is a repository secret (value never shown)
  CHECK: gh secret list -R executiveusa/pauli-starnet
  EXPECT: /^CLAUDE_CODE_OAUTH_TOKEN\s/m
  EVIDENCE: pending

- [ ] G3: the review gate counts the Claude Review workflow as the reviewer
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

- [ ] G9: on the merged StarNet checkout, every fast test passes except the 3 known base failures listed in HANDOFF
  CHECK: bash -c 'cd /opt/starnet/one-system && f=0; while read -r t; do case "$t" in ""|\#*) continue;; esac; node "$t" >/dev/null 2>&1 || case "$t" in *qa-product-perfect-claims*|*crt-context-loss*|*website-app-sync*) ;; *) echo "NEW FAILURE $t"; f=1;; esac; done < test/fast.list; [ "$f" = 0 ] && echo FAST-TESTS-NO-NEW-FAILURES'
  EXPECT: FAST-TESTS-NO-NEW-FAILURES
  EVIDENCE: pending

- [ ] G10: on the merged Command Center checkout, install, acceptance and build pass
  CHECK: bash -c 'cd /opt/starnet/command-center && npm ci >/dev/null && npm run -s verify:acceptance && npm run -s build >/dev/null && echo CC-ACCEPTANCE-AND-BUILD-OK'
  EXPECT: CC-ACCEPTANCE-AND-BUILD-OK
  EVIDENCE: pending

- [ ] G11: the OpenRouter key StarNet uses is accepted by OpenRouter (key never shown)
  CHECK: bash -c 'set -a; . /etc/starnet/workforce.env; curl -fsS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/key && echo " OPENROUTER-KEY-OK"'
  EXPECT: 200 OPENROUTER-KEY-OK
  EVIDENCE: pending

- [ ] G12: Paperclip and the workforce gateway are running as services
  CHECK: bash -c 'systemctl is-active paperclip.service starnet-workforce.service | sort -u | tr -d "\n"; echo'
  EXPECT: /^active$/m
  EVIDENCE: pending

- [ ] G13: L1, the live factory acceptance run, passes every step with nothing left unrun
  CHECK: bash -c 'set -a; . /etc/starnet/workforce.env; cd /opt/starnet/one-system && FACTORY_GATEWAY_URL=https://factory.thepaulieffect.com FACTORY_OWNER_TOKEN="$GATEWAY_BEARER_TOKEN" node scripts/factory-live-acceptance.mjs'
  EXPECT: /\d+ steps: \d+ pass, 0 fail, 0 not run/
  EVIDENCE: pending

- [ ] G14: L2, the walk test on the live checkout covers all 12 districts
  CHECK: bash -c 'cd /opt/starnet/one-system && node test/icm-walk.test.js'
  EXPECT: (12 districts, 51 agents)
  EVIDENCE: pending

- [ ] G15: L3, Instinct is acting chief over HTTPS while its heartbeat runs
  CHECK: bash -c 'set -a; . /etc/starnet/workforce.env; curl -fsS -H "Authorization: Bearer $GATEWAY_BEARER_TOKEN" https://factory.thepaulieffect.com/v1/factory/chief'
  EXPECT: "acting":"instinct"
  EVIDENCE: pending

- [ ] G16: L3, Heisenberg became acting chief after 6 minutes without the heartbeat, then Instinct again when it resumed (record both responses with times)
  EVIDENCE: pending

- [ ] G17: L4a, no standing mission was created before any approval, across one scheduled time (Paperclip issue list attached)
  EVIDENCE: pending

- [ ] G18: L4b, after Bambú approved one revenue standing job on the phone, its mission appeared once for the named agent and nothing else was scheduled (or NOT_RUN by Bambú's choice, written here)
  EVIDENCE: pending

- [ ] G19: the Command Center production page at /starnet/control shows the acting chief, districts, agents and scheduled jobs from live StarNet, not "Not connected" (screenshot)
  EVIDENCE: pending

- [ ] G20: L5, a found-first-launch run started from the phone assigned stage 1 to boring-marketer and stopped at the owner gate after outreach-draft
  EVIDENCE: pending

- [ ] G21: L6, "Tell Instinct" created an order Instinct acknowledged by id, and a direct task became a mission with a "you went direct" notice
  EVIDENCE: pending

- [ ] G22: L7, a mission needing publish parked, the phone showed its exact permissions, and Bambú's authorization released it (with the owner approval key)
  EVIDENCE: pending

- [ ] G23: L8, emergency stop (typed STOP) paused every worker and Resume all resumed them
  EVIDENCE: pending

- [ ] G24: L9, after 24 hours, receipts show lanes and route notes and month-to-date spend is under budget
  EVIDENCE: pending

- [ ] G25: L10, after one night, no duplicate missions and no stuck run without a nudge or escalation
  EVIDENCE: pending

- [ ] G26: the evidence PR (LIVE-EVIDENCE.md) is open in pauli-starnet
  CHECK: gh pr list -R executiveusa/pauli-starnet --state open --search "LIVE-EVIDENCE in:title" --json number -q length
  EXPECT: /^[1-9]\d*\s*$/
  EVIDENCE: pending

- [ ] G27: the Claude Review approved the evidence PR's head commit, and Bambú received the link and a five-line summary
  EVIDENCE: pending
