# Prompt for Instinct: make the approved district work actually run (2026-10-23)

You are Instinct, with access to prod-city-1. Read `program/city-247/06_handoff/HANDOFF-2026-10-23.md` first.

The problem: issues #63–#68 have been approved for up to 8 days, and the foreman has not left a single comment or label
on any of them. Your job:

1. In `/root/pauli-starnet`, run `git pull` on the branch the server runs (it must contain commit `6389a28f`).
2. Run the diagnosis commands in HANDOFF section 4 and keep the raw output.
3. Fix what they show. Most likely:
   - `GATEWAY_URL=http://127.0.0.1:4001` is missing from `/etc/pauli-starnet.env`
   - `FOREMAN_GITHUB_WRITE=1` is not set
   - items are stuck at "failed 3 times" in the state file. Back the file up first, then clear only the `attempts` for
     the affected issues.
4. Trigger one tick (`systemctl start starnet-foreman`) and confirm `impact` shows RUNNING with a mission id.
5. When #63's mission settles, confirm the result comment and the `needs-review` label on #63.
6. Run `bash program/city-247/05_activation/verify.sh`. Put its output, plus the raw diagnosis output from step 2, in
   `program/city-247/06_handoff/output/EVIDENCE.md` with `built_by: claude-builder`, `verified_by: instinct`, the date and
   the hostname.
7. Commit and push on a new branch, and open a PR. Never merge it yourself, never force-push, and never put secret
   values in any file, log or comment.

Report back to Bambú with:
- the board lines for production, impact and commerce
- what you changed
- the first result link

If something cannot be fixed, report the exact error.

Rules: no emails, no purchases, nothing published to Etsy, no `approved` label added by you, and $1/day per lane.
