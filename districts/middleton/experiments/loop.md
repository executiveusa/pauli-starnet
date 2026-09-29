# Experiment loop

Purpose: the district tests the method on its own, in the open, with receipts.

Cycle (propose -> approve -> run -> receipt):
1. PROPOSE: an experiment card in log.jsonl (hypothesis, canon reference, audience, metric, cost ceiling, undo).
2. APPROVE: owner approves the card (or it stays a draft). No approval, no run.
3. RUN: smallest possible test. Free floor first. No real-lead contact without the boundary in README being satisfied.
4. RECEIPT: result appended to the same card (metric observed, decision: adopt/adjust/kill, evidence link).

Standing experiment queue (drafts, unapproved):
- E1: gap-audit on crew-shuttle/transport niche in Palm Beach county (served/partial/unserved vs the 7 services) - feeds Spatchy sales.
- E2: nurture-drafter on Spatchy intake: instant SMS acknowledge + qualify flow, branch lead-nurture on dispatchhelper (his separate-branch rule).
- E3: reactivation-drafter generic template per canon script, tested on a synthetic list.
- E4: sales-coach-grader on the 4h48m live-calls transcript: grade JPs own calls vs the canon 7-step process as calibration.
