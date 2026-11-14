# Commerce district — Freedom of Speech store (test-only)

One job: get the Freedom of Speech print-on-demand store (`executiveusa/freedomofspeech`) to its first owner-approved
listing batch, without listing, selling or spending anything on our own. Queue: `district:commerce` issues.

## The store's own law wins
The store repo has its constitution and pipeline (brief → design → gate → listing → experiment → report). Agents
may not add categories, edit the constitution, or act on OPEN decisions. Read its `AGENTS.md`, `SANDBOX.md` and
pass its `WALKTEST.md` before writing there.

## Blocked on the owner today (the store's OPEN decisions)
- 0002 legal line for designs · 0004 seed budget and daily cap · 0009 categories beyond Trump ·
  0003/0020 seller of record and the store account (identity and payout are human-only steps).
Until these close, the lane does research only: niches, demand signals, competitor listings, using the knowledge
routed to commerce (Mozi offers, MetricsMule UGC ads).

## What is built (prepare only)
- `etsy/listing.js`: turns a gate-passed, independently verified design into an Etsy draft-listing payload and the
  stage 04 `listing-NNN.md` file. No network code. It refuses anything without a gate pass, a different verifier,
  owner price, shipping/readiness ids, production partner disclosure, or with a banned legal-line term.
  Fields are UNVERIFIED against Etsy's live spec from the builder's container; check before the first live call.

## Never
List, publish, price live, buy, open accounts or contact anyone. Those are the owner's steps.
