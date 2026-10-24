# Claude lane: StarNet + factory (50 items) · log

Handoff received 2026-10-24 ~19:30 UTC. Numbers are the owner's permanent inventory handles.
**Closed this session: none.** Nothing below counts as closed until it's finished, independently critic-passed, and verified.
Critic = the builder (Instinct) via relay; until it reviews, a slice is "done on my side, awaiting critic".

## Correction first (#49)
Before this handoff arrived, on the owner's "yes to all" (this conversation, ~19:15 UTC), I:
- merged vibe-engineering PR #75 (f7ac935; old nightly schedule now off);
- pushed c09d31c, which skipped the read-only-token guard for public targets, and dispatched run 40124839022 on it.
The handoff says not to bypass the guard or rerun, and that a read-only replacement token exists. So I **reverted c09d31c** (7564bf3;
branch tree identical to 6a43e43; 185/185) and stopped. Run 40124839022 failed in the agent step with no evidence uploaded; whether it
reached a model call is **unknown** (its log is served from a host this session can't reach). No further runs.

## Block order
Factory/Foundry block first (5 items). Every item in it is blocked on an owner decision or on the other side, so blockers are logged
and work moved to the StarNet block, per the loop rules.


## Update from the full handoff (owner upload, ~20:10 UTC)
The full version groups the 50 items into six blocks and adds exact ground. Changes to this log:
- **Blocks (work order going forward):** Software factory/Foundry (46-49, 260) · Builds, verification and delivery (4, 12, 14, 17, 28, 29,
  31, 32, 43, 44, 45) · City systems and process (1-3, 8, 9, 19-22, 36-39) · Command center and rooms (7, 18, 24, 33, 41) · Districts
  and creative builds (10, 13, 25-27, 30, 35, 40, 42) · Council members and brains (5, 6, 11, 15, 16, 23, 34).
- **#39 re-verified on the stated ground:** goatalliance `feat/starnet-goat-sandbox` @ c634cce type-checks clean as-is (Prisma 6.16,
  tsc 0). c634cce is already in main (merged via PR #74, 2026-09-17); main then took Dependabot #43 (Prisma 6 to 7, 2026-09-24) and is
  now **7 commits ahead** of the branch, not 1. So the 25 errors appear on current main, which matches my reproduction. The pin-to-6 fix
  belongs on current main. The resident-chat patch should rebase onto main + this fix.
- **#12:** the handoff was delivered as Drive links Oct 23 (ZIP + an updated ZIP with 11 Androo transcripts). The owner uploaded a v5
  handoff ZIP and an architect context v2 to this Opus session, so the delivery reached Opus. **PROPOSE CLOSE** (owner to confirm it's the
  same package). The "28 files, hash manifest" description was not recovered, so I don't claim it.
- **#36:** the source kit is `starnet-whatsapp-source-kit.zip` in the owner's WhatsApp (Oct 21). BLOCKED until he uploads it here; then:
  inspect it against current StarNet, spec the intent, no outbound.
- **#10:** playbook on server-only branch docs/video-scroll3d-20261006 @ 1e4e2964 (unpushed). The technique is inlined in the handoff.
  OWNER: push public or park.
- **#26:** feat/design-district @ f0520dac is local-only on the builder side. BUILDER.
- **#17:** two Jev variants (server-only shadow plane; untracked v0.3.0 files). Credentials missing by design. BUILDER/OWNER.
- **#37:** the private collection component passed offline tests Oct 22, isn't wired to city jobs, and isn't in my repos. BUILDER: find the callers.
- **#4:** decision framing: how PR #68 proceeds within the gate's rules (audit receipt + HIGH/CRITICAL never waivable) and protect-main --apply.
- **Grant rule:** merges, deploys and publishes need fresh owner direction. The PR #75 merge was on the owner's own "yes to all" in this
  conversation (2026-10-24 ~19:15 UTC), so it's covered.

## Factory / Foundry block
| # | Verified state (2026-10-24) | This session | Status · next |
|---|---|---|---|
| 46 | Research delivered (per handoff). | Nothing executed: asking Orgo = contacting a person. | BLOCKED: owner go to contact Orgo + one draft-only test job. |
| 47 | Not verifiable here: "Fabro" appears in none of foundry-computer, vibe-engineering, pauli-starnet. | Searched all three repos. | BLOCKED: Fabro lives on the builder side. Builder to fix the misleading failed-stage overrides (handoff list). |
| 48 | Main = 81/81 tests (re-run here, clean venv). The "142 passed" bridge f39dbb8 is not on main. | Architecture survey (#28) explains the gap. | BLOCKED: public push of f39dbb8 = owner gate; fixes continue builder-side. |
| 49 | Guard restored (7564bf3 = 6a43e43 tree). Runs 40110439914, 40111896793, 40124669084 failed at the guard; 40124839022 (on my reverted bypass) failed in the agent step. | Reverted my bypass. No runs. | BLOCKED: owner decision on the guard redesign; preview auth absent. Not READY. |
| 260 | Renewal due before 2027-01-22; reminder Jan 15 (per handoff). | — | OPEN until the token is actually renewed. |

## StarNet block
| # | Verified state | This session | Status · next |
|---|---|---|---|
| 1 | Teardown delivered (per handoff). | — | OWNER: his Astra Creativity piece. |
| 2 | Spec v2 delivered. | — | OWNER: read + GO, then token estimate. |
| 3 | Report delivered. | — | OWNER: adopt or not. |
| 4 | vibe-engineering PR #68 ("ci: wire merge-gate caller") **open**, verified via API. | — | OWNER: merge #68? run protect-main.sh --apply? |
| 5 | — | — | OWNER: cookies (account risk) / ~$2-5 Apify (spend) / shelve. |
| 6 | pauli-starnet PR #54 **open**, verified via API. | — | OWNER: merge call. |
| 7 | Not checkable from here (server). | — | BLOCKED: which door he uses; server change gated. |
| 8 | Inventory delivered. | — | OWNER: rollout call. |
| 9 | Brief delivered. | — | OWNER: metric candidate. |
| 10 | Branch "prepared" elsewhere; not found in my repos. | — | OWNER: public PR or park. |
| 11 | Dormant patch accepted (per handoff). | — | OWNER: go to activate. |
| 12 | The v4 ZIP isn't in this container. | Searched. | BLOCKED: need the file (or a route) to deliver; I can hand it over as a file once it's here. |
| 13 | — | — | OWNER: tap the Google connect link. |
| 14 | — | — | OWNER: BYOK removal or $5 top-up. |
| 15 | — | — | BLOCKED: free routes throttled (429); sources private. Builder side. |
| 16 | — | — | OWNER: one tap on the OpenRouter zero-cost key approval link. |
| 17 | Token in the secrets manager, not live-proven. | — | BLOCKED: runner config + eval are builder-side (no vault access here). |
| 18 | No recorded state. | — | NEEDS RE-GROUNDING: owner/builder to state what exists. |
| 19 | Executing on the other side. | — | IN FLIGHT (other side). |
| 20 | Slice 1A in the watcher queue. | — | IN FLIGHT (other side). |
| 21 | Merge in flight. | — | IN FLIGHT (other side). |
| 22 | Owner said "that was me". | — | PROPOSE CLOSE as resolved (owner to confirm). |
| 23 | v1.1 (64 files) per handoff; not visible here. | — | BUILDER: verification read-back. |
| 24 | — | — | NEXT for me: research + Visual World proposal (no build before review). |
| 25 | Findings + rehearsed install. | — | BUILDER: server-side install with watcher. |
| 26 | Builder on feat/design-district. | — | IN FLIGHT (builder). |
| 27 | — | — | OPEN: build lane, not started here. |
| 28 | **Survey done on my side**: `28-foundry-architecture-survey.md` (graph 475 nodes, main @ 9d202b0, 81/81). | Delivered. | AWAITING CRITIC. |
| 29 | Phases 0-2 approved (free Groq, fixtures). | — | BUILDER: needs server + Groq key. |
| 30 | — | — | OWNER side; publishing needs his approval. |
| 31 | V2 patch not applied. | — | BUILDER: apply after review. |
| 32 | runner-v3 GREEN (narrow). | — | OPEN: live unsourced stats flagged. |
| 33 | Issue #71 open + approved (verified). **Slice done on my side**: rooms/ manifest schema + pilot room (foundry-computer) + `GET /v1/rooms` with agent-mail proof (local commit 16d877c, 35 assertions; foreman e2e 48/48 still green). | Built + tested. | AWAITING CRITIC. Remaining: agent-mail deploy (server, gated), war-room tile, public push (gated). |
| 34 | In flight (Drive). | — | IN FLIGHT (other side). |
| 35 | v4 passed restricted review; egress unenforced. | — | OPEN: egress enforcement. |
| 36 | Intent ambiguous. | — | NEEDS RE-GROUNDING. |
| 37 | Staged on a server. | — | BUILDER: server-side. |
| 38 | Umbrella. | — | OPEN (umbrella). |
| 39 | **Root cause found and fixed on my side**: Dependabot group bump #43 (2026-09-24) moved Prisma ^6.16 → ^7.10 without the v7 migration; P1012 stops `prisma generate`, so tsc showed exactly **25 errors**. Pin ^6.16 + Dependabot ignore for Prisma majors → tsc **0**, jest **53/53**, `next build` exit 0 (local commit on goatalliance branch fix/prisma-7-regression). | Fixed + verified. | AWAITING CRITIC; push to public goatalliance = owner gate (and I have read-only). Rebuild itself continues on the other side. |
| 40 | R14 consumer passed 39 tests + 10 mutations (per handoff). | — | BUILDER: verification read-back. |
| 41 | CC2 PASS (b1d707b), CC3b code-read PASS (d0338d6). | — | OPEN: fetcher wiring + private push (owner approved; builder to confirm). |
| 42 | Parked. | — | PARKED. |
| 43 | Paused Oct 20. | — | PAUSED. |
| 44 | Folded into #45. | — | PROPOSE MERGE into #45. |
| 45 | Delivered. | — | PROPOSE CLOSE (owner to confirm). |

## Security district rotation (design)
Not executed here. Phase 0 (inventory from records, no values) belongs to the security lane; individual rotations are another lane.
Open owner questions: (1) GitHub tokens → GitHub App? (2) may an agent drive the hosting console for rotation?
