# 09_focus — prune to the core and turn the machine into revenue

One job: the two servers run only the core stack, the chief owns a weekly money scoreboard, and MACS and Kupuri
close their first paying Found First clients.

## Inputs
- Review and numbers: REVIEW.md (this folder)
- Core stack: ../../../registry/core-stack.json
- Prune tool: ../../../scripts/one-system/prune-plan.mjs (tests: ../../../test/prune-plan.test.mjs)
- Go-live: ../08_activation/HANDOFF.md and ../08_activation/finish/*.md (unlazy gates)
- Offer: executiveusa/found-first business/offer/FOUND-FIRST-OFFER.md; sales lens: districts/pauli/board/seats/king-doe.md
- Chief's orders: INSTINCT-V2-PROMPT.md (this folder)

## Process
1. Finish go-live first: the 27 gates in ../08_activation/finish/ reach ALL MET or a written handoff.
2. Security before pruning: make `pauli-sercets-vault-` private or delete it, rotate its keys, start the credential
   register (REVIEW.md, "Security").
3. On each server, capture the inventory (read-only):
   `docker ps -a --format '{{json .}}' > docker.jsonl` and
   `systemctl list-units --type=service --all --no-legend --plain > services.txt`.
4. Run `node scripts/one-system/prune-plan.mjs --server <name> --docker docker.jsonl --services services.txt --emit out/`.
   Send Bambú the plan. Anything "unknown" is asked about, never guessed; add a rule to core-stack.json and rerun.
5. After Bambú approves, run phase 1 (`CONFIRM=PRUNE-<server> out/<server>-phase1.sh`). Keep the restore script.
   Phase 2 (removal) only after 7 days and a second approval.
6. Weekly: the scoreboard in REVIEW.md, sent every Monday in one message.

## Outputs
- output/EVIDENCE.md: the plan for each server, what was stopped, before/after counts and disk, and the weekly
  scoreboard with its sources.

## Human check
Bambú approves each server's plan before phase 1 and again before phase 2, approves every client-site decision, and
reads the Monday scoreboard. The prune plan never touches core, client, migrate or unknown items.
