# Prompt for Instinct: finish and verify city-247 (StarNet districts working 24/7)

You are Instinct, Bambú's main agent, with access to the servers. The builder session wrote and tested the code for
24/7 district work in `executiveusa/pauli-starnet`, branch `claude/multi-agent-architecture-qc3xrf` (draft PR #62,
head `be5f77b3cb1a1e6d0d9bc4de58dc220c49325a20`). Your job is to hook it up on the server, commit and push anything
the hookup needs, and **verify** it independently. The builder never verifies its own work; you are the verifier.

Bambú has authorized you to do the steps below. Where a step says **OWNER**, do it only if your credentials have the
right; otherwise list it as a blocker in your report. Do not guess at anything marked UNVERIFIED: find the real value
on the server and record it.

## Hard rules (unchanged)
- No secret values in any commit, log you paste, comment or report. Use Infisical names only (project HERMES).
- No emails, ever. No purchases, no paid API calls beyond the existing $1/day/lane cap. Jev's ceiling is $3 total.
- Do not touch the ASC3ND or Crown & Core repos.
- No force-push, history rewrite or destructive reset. Commit on top of the branch.
- The Commerce lane prepares drafts only: nothing is published to Etsy or anywhere else.
- Nothing unattended runs without the `approved` label on its issue.

## Inputs (on the branch, in `program/city-247/05_activation/`)
- `HANDOFF.md`: the full step list with the expected output of each step.
- `verify.sh`: runs every check and prints PASS/FAIL/SKIP per line. It never prints secrets.
- The migration, systemd units and seed list are on the branch at the paths named in each step.

## Steps
1. **Get the code.** In the server checkout of pauli-starnet (find it; the units assume `/opt/pauli-starnet`, which is
   UNVERIFIED): `git fetch origin claude/multi-agent-architecture-qc3xrf && git checkout claude/multi-agent-architecture-qc3xrf`.
   Confirm `git rev-parse HEAD` is `be5f77b3…` or a descendant. Run `npm ci` if `node_modules` is missing.
2. **Run the tests the branch added:**
   `for t in knowledge district-foreman review-gate first-lanes; do node test/$t.test.js || echo FAIL $t; done`.
   All four must pass. (Seven other fast-list tests fail on the base branch too; they are not part of this job.)
3. **Database (self-hosted Supabase, docker project `supabase`).** Follow HANDOFF §1: apply
   `db/migrations/20261015_0001_knowledge.sql`, run `scripts/knowledge/ingest.js` and load its SQL. Then load the
   server-held transcripts with `--only … --dir …`:
   - Jasper's 50 smart-site transcripts (NEW box, reported at `/root/jasper-highlevel-transcripts/selected50`)
   - Manny's 315 Hormozi transcripts (old box; find the folder)
   - If you can find Stefan's raw 3D transcripts or the AndrooAGI study, add them to `knowledge/sources.json` with
     routes and `use_for`, ingest them, regenerate `knowledge/MANIFEST.json` (the knowledge test tells you if it
     drifts) and commit.
4. **Gateway.** Set `KB_SUPABASE_URL` (Kong, reported at `http://127.0.0.1:8001`) and `KB_SUPABASE_SERVICE_KEY` in
   the gateway env from Infisical. Make sure the gateway runs this branch's `gateway/` code. Restart pm2
   `pauli-gateway`. If the gateway runs from a different checkout than the foreman, set `STARNET_DISTRICT_STATE` to
   the **same absolute path** in both envs, so the foreman writes the board where the gateway reads it.
5. **The 24/7 tick.** Fix `WorkingDirectory` in `deploy/systemd/starnet-foreman.service` to the real checkout path.
   If it changed, commit it. Create `/etc/pauli-starnet.env` (mode 600) with `GITHUB_TOKEN`, `GATEWAY_BEARER_TOKEN`,
   optional `GATEWAY_URL` and `FOREMAN_GITHUB_WRITE=1`. Install and enable `starnet-foreman.timer` (HANDOFF §3).
   Run one tick by hand: `systemctl start starnet-foreman && journalctl -u starnet-foreman -n 20`.
6. **OWNER: queues.** Enable Issues on `executiveusa/pauli-starnet`
   (`gh api -X PATCH repos/executiveusa/pauli-starnet -F has_issues=true`). Then seed:
   `node scripts/queue/seed.js program/city-247/04_first_lanes/seed-issues.json`. Do **not** add `approved`
   yourself: Bambú approves. Tell Bambú which issue numbers were created.
7. **OWNER: review gate.** The gate needs a reviewer login that is not `executiveusa`. If Bambú has given you one
   (a bot account or a teammate), set the repository variable:
   `gh api -X POST repos/executiveusa/pauli-starnet/actions/variables -f name=REVIEW_GATE_REVIEWERS -f value=<login>`.
   Then have that account review PR #62 on its head commit. Do not make the status required in branch protection
   until Bambú says so.
8. **Verify.** Export the variables `verify.sh` lists at its top and run `bash program/city-247/05_activation/verify.sh`. Paste its full output
   (it contains no secrets) into `program/city-247/05_activation/output/EVIDENCE.md` with
   `built_by: claude-builder`, `verified_by: instinct`, the date and the server hostname.
9. **Commit and push** to `claude/multi-agent-architecture-qc3xrf`: the evidence file plus any path fixes from
   steps 3–5, with commit messages saying what changed and why. Do not merge PR #62: Bambú merges once the review
   gate says SHIP.
10. **Report to Bambú.** Give every verify line that is not PASS with its exact reason, the issue numbers created, and
    what is still owed:
    - the first real crew mission per lane, after Bambú approves an issue
    - decisions 0002, 0004 and 0009 and the seller of record for the store
    - rotation of the leaked secrets (Stripe live key first; the types are listed in HANDOFF §6)

## Done means
`verify.sh` shows PASS for:
- the code and the four tests
- the database (documents ≥ 436, district search returns rows)
- the gateway (`backend: supabase`, 12 districts, `stale: false`)
- the timer
- GitHub Issues enabled, with the seeded issues present

Every remaining line is SKIP or FAIL with a named owner action, and the evidence is committed and pushed.
