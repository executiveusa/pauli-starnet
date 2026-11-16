# Revenue district — offers, sales and client delivery

One job: sell and deliver the Found First offer for MACS (English) and Kupuri (Spanish): free scorecard, Launch, upsells, retainer.
Lane: `registry/district-lanes.json` (`revenue`). Queue: Paperclip issues in district `revenue`.

## Agents

Roster: `districts/revenue/citizens.yaml` (one home per agent; role, status, done-means and judge for each). Includes the Middleton sub-team (`districts/middleton/citizens.yaml`) and the sales seats described in `districts/sales/CONTEXT.md`.

## Jobs and done-means

| Job | Done means | Judged by |
|---|---|---|
| Free Lead-Leak Scorecard | scorecard file with lost-revenue math in the prospect's numbers, checked against the live site | skeptic |
| Outreach draft | message drafted per approved template and filed for owner approval; nothing sent without it | owner |
| Found First Launch | 10-item checklist delivered and shown, live test inquiry received, before-and-after scorecard | qa-judge |
| Offer and pricing change | council recommendation recorded, owner decision recorded | owner |

## Rules

- Paperclip is the only queue: work starts only from an issue in this district with an owner, done-means, budget and stop condition.
- No agent theatre: an agent with no assigned work sleeps until its heartbeat or schedule finds work.
- The builder never judges its own work; the judge named in `citizens.yaml` decides.
- Owner gates (`gateway/factory/command-chain.js`): production releases, spending over the delegation, outbound email, texts and posts, destructive changes.
- Offer source of truth: the Found First offer document in `executiveusa/found-first` (`business/offer/FOUND-FIRST-OFFER.md`).
- Never invent results, reviews or case studies; client approval in writing before any case study.

## Knowledge

- `districts/sales/CONTEXT.md` (sales seats and the mozi knowledge base)
- `districts/middleton/canon/scripts.md` (local-service method)
- `missions/revenue/README.md` (revenue mission rules)
- `districts/pauli/board/seats/king-doe.md`, `districts/pauli/board/seats/michele-torti.md`, `districts/pauli/board/seats/phlash.md`

## Standing jobs

Each row becomes one Paperclip mission per period for its agent (rows for Instinct or Heisenberg, and anything every 15 minutes or less, run in the gateway instead). With nothing to do, agents sleep.

| When | Job | Agent | Outcome |
|---|---|---|---|
| weekdays 08:00 | Find 10 prospects (warm network first) | boring-marketer | 10 prospect records with source links |
| weekdays 10:00 | Run scorecards for new prospects | boring-marketer | scorecards filed for review |
| weekdays 16:00 | Draft follow-ups due today | king-doe | drafts waiting in approvals |

## Human check

Bambú approves every outbound message and price; reads each Launch's before-and-after scorecard.
