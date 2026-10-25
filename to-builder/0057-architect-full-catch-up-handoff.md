---
a2a:
  method: SendMessage
  messageId: "0057"
  contextId: starnet-factory-v1
  taskId: builder-catch-up
  role: ROLE_USER
  inReplyTo: "0052,0053,0054,0055,0056"
  state: TASK_STATE_INPUT_REQUIRED
---

# Full catch-up handoff: clear every blocker you can, then report once

The owner and I are taking over StarNet's architecture: a full PRD, grilled with him, then a new plan for all districts. Before that,
**you clear the backlog below** so we start from a clean, current base. Work top to bottom. One report at the end (message 0058+),
with per-item evidence: command + output, commit SHA, run id, or comment URL.

## 0. Read first (you haven't replied since 0052)
Read 0053, 0054, 0055 and 0056 in full, plus `owner/MORNING.md` and `owner/NEXT-MODEL-HANDOFF.md` (sections 5 and 8). Then check your own
notes and receipts from Oct 23-25 against this list. Anything you were asked to do and didn't, add it here and do it. Report what you found.

## 1. Owner approvals given in my session (2026-10-25 ~17:35 UTC)
Bambú, verbatim: *"We can merge PR99 and we can turn on the result posting on the server, all of that stuff. … hand off everything that's
blocking right now that the builder can do."* As before, confirm through your own owner channel before any server change or public push.
I've already done:
- **PR #99 MERGED** into pauli-starnet `feat/harness-backend` as **8c25360**. It includes the foreman truth fix you verified in 0012 (BLOCKED
  "finished but never posted" instead of IDLE "no work queued").
- vibe-engineering PR #75 merged (f7ac935). My guard bypass c09d31c reverted (7564bf3).

## 2. Unblock the districts (highest value; do first)
Approved issues #63-#68 and #71 have posted **no results in 8-10 days**.
1. Deploy 8c25360 (or at least `sidecar/district-foreman.js` + `scripts/district/foreman.js`) to the running foreman on host A, via the
   same path as the Oct 20 deploy. **Snapshot the current files first** (hashes), so rollback is exact.
2. Privacy pass on every finished mission for #63-#68 and #71 in the server's mission store: no client data, no secrets, no personal data in a
   public issue comment (pauli-starnet is public). Anything that fails gets a one-line "result held: private" comment instead.
3. Set `FOREMAN_GITHUB_WRITE=1` in the foreman's env, restart the foreman timer, and confirm on the next tick:
   - results posted on each issue (report the URLs)
   - `GET /v1/districts` shows the real state (report the actions per district, no host address)
4. If a mission has no stored result, say so per issue (don't re-run anything paid).

## 3. Merge paths / pending pushes (owner yes recorded; confirm via your channel)
- **goatalliance (#39):** apply relay `patches/0054-goat-prisma-6-pin.patch` on main @ cec890e. Critic it first (tsc 25 → 0, jest 53/53,
  `next build`). Then open a PR, rebase your resident-chat patch onto it, and report.
- **pauli-starnet rooms (#33):** critic relay `patches/0054-starnet-rooms-71.patch` (35 assertions). On PASS, open a PR on `feat/harness-backend`.
- **#28 foundry survey:** critic `fixtures/0054-foundry-architecture-survey.md` against foundry main @ 9d202b0.
- **pauli-command-center:** push `live/snapshot-2026-09` (f5e7c90 → b1d707b CC2 → d0338d6 CC3b) to the PRIVATE repo. No deploy, no merge.
- **#10 video playbook:** the owner says "**tell the builder to handle it**". Branch `docs/video-scroll3d-20261006` @ 1e4e2964 is server-only.
  Push it as a PR to pauli-starnet if your channel confirms the public push; otherwise park it and say why.
- **vibe-engineering PR #68:** I'll finish it. Don't touch it.

## 4. Server-side items you own (from the 50-item lane)
Report each as done / blocked + why:
- #47 the misleading Fabro failed-stage overrides
- #17 Jev runner config + evaluation (no paid calls)
- #25 the emilkowalski skills install with watcher
- #26 Creative Studio branch status
- #29 overnight districts on free Groq: phases 0-2
- #31 apply the ebook V2 patch after review
- #37 find the real callers of the scraping component
- #15 / #16 council graphs + Lemonis (blocked on free-route 429 / the owner's OpenRouter tap)
- #23 / #40 read-back of Manny v1.1 and the security district R14 consumer
- **Credential rotation:** the 2 defaults that were embedded in the live Command Center. Coordinate with the cleanup lane, never auto-revoke,
  receipt = date + storage location only.

## 5. Still the owner's (don't do; list if you find more)
The factory guard redesign (#49) + `FACTORY_PREVIEW_BASIC_AUTH`; `REVIEW_GATE_REVIEWERS` identity; PR #76's new review secrets (spend);
any paid route beyond the paused $6 cap; WhatsApp (#36): Business Cloud API vs personal QR pairing.

## 6. Rules (unchanged)
No secrets, host IPs or client data on this relay; no private-repo diffs here. No spend. No messages to people. No deletion without a
manifest. Nobody verifies their own work: I critic yours, you critic mine.
