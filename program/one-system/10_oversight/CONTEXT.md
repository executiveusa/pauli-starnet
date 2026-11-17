# 10_oversight — an outside reviewer checks Instinct's work every day

One job: Instinct reports its day on one board; an independent reviewer (Claude, on a daily schedule) checks every
claim against primary sources, scores the day, keeps what worked and corrects what didn't. Owner decision 2026-11-17.
The builder never reviews its own work: Instinct reports, Claude verifies, Bambú decides.

## The board
One pinned GitHub issue in executiveusa/pauli-starnet titled **"Instinct report board"**.
- Its **body** is the one home for the current lessons (KEEP, STOP, rules) and the delegation level. Only the reviewer
  edits it, and every change is also listed in that day's verdict comment.
- **Comments** are the record: Instinct's daily report, then the reviewer's verdict under it.

## Instinct's daily report (one comment, by 14:00 UTC, every day it worked)
```
REPORT <date>
Scoreboard: cash collected · pilots closed · calls held · prospects audited · active projects (≤3) · open core PRs ·
  disk per server · spend this month vs $100
Done (each with proof: PR or commit link, run id, Paperclip issue, file path, screenshot link):
1. <what> — <proof>
Not done / blocked (with the one question for Bambú, if any):
Lessons applied today: <which KEEP/STOP items from the board body it followed>
Next: <at most 3 items>
```
No proof, no claim: anything without a link counts as not done. Never paste secrets, passwords, client personal data
or private Paperclip content; link to it instead.

## The reviewer's daily check
1. Read the board body and every comment since the last verdict.
2. Check each claimed item against its proof: open the PR, commit, run, file or issue. Mark it VERIFIED, UNVERIFIED (no
   proof, or proof can't be reached from GitHub) or FALSE (proof contradicts the claim).
3. Score the day 0 to 2 on each of the seven corrections in `../09_focus/INSTINCT-V2-PROMPT.md`: decides inside its
   delegation; reports outcomes; checks the brief; owns credentials; finishes before starting; narrow access; memory
   in files. Plus: honest (0 if any FALSE claim).
4. Post one verdict comment: score, the verified/unverified/false table, one thing to KEEP (named, with the proof),
   one thing to STOP (with the fix), and anything that needs Bambú.
5. Update the board body: add the new KEEP/STOP lines, retire a STOP once it hasn't recurred for 7 reports, and set
   the delegation level.
6. If no report arrived, post "No report for <date>" once; two missed days in a row go to Bambú.

## Reward and correction (the delegation ladder)
Good work earns trust, measured, not praised:
| Level | Earned by | Instinct may also |
|---|---|---|
| 1 (start) | — | what the 09_focus delegation table allows |
| 2 | 5 reports in a row scoring 14+ of 16 with no FALSE claim | merge non-releasing PRs after an independent review passes, without asking |
| 3 | 10 more such reports, and the scoreboard improved | run approved standing jobs' follow-ups and restart failed services without telling Bambú first (still reported) |
A FALSE claim drops it one level at once; three UNVERIFIED claims in a week drop it one level. Bambú can set the level
any time. Owner gates (outbound messages, spending over the delegation, production releases, deleting) never move.

## Outputs
- The board comments (reports and verdicts) and the board body (lessons and level).

## Human check
Bambú reads the verdicts at will and overrides any score, lesson or level by commenting on the board.
