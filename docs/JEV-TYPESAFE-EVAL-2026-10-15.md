# Jev (TypeSafe System One) evaluation design - EVALUATE, DO NOT ADOPT

2026-10-15, desk. From todo-01M380F9YTY888JKV36E2NDKQN (Kev short youtube.com/shorts/8_f8Jtnrl20).
Standing gates: $3 OpenRouter hard cap; never Visa 1074; the TypeSafe API key and any cost are
HIS call. This doc is design + verification only. Nothing here runs paid.

## What Jev is (verified, not vendor-claimed-only)

TypeSafe AI (Diogo Almeida) launched Jev on 2026-09-15 as a "System One" decision model:
you send a state (text/JSON) plus typed questions - Choice (pick one of N, with probabilities),
Score (rubric level with probabilities), Noul (yes/no probability) - and get back bounded
decisions, not prose. Trained with RLCD (calibrated decisions). It does not write replies,
code, or explanations. Vendor claims: 20-200x faster, ~$0.042/M input tokens.
Sources: typesafe.ai/blog/introducing-system-one-models-and-jev, docs.typesafe.ai/models,
requesty.ai/blog/typesafe-jev-explained (2026-09-19). Also listed on Vercel AI Gateway.

Fit thesis for us: our expensive lanes spend LLM tokens on narrow judgments (pick the next
click, score this candidate) that a decision model could pre-filter. The eval tests whether
Jev's judgments agree with the current lane's outcomes enough to trust it as a filter.

## Lane 1: jev-browser next-click layer vs current path

Question type: Choice over the candidate elements on the page (current picker supplies the
same candidate set it uses today).
Design:
1. Capture N=100 frozen decision points from recorded jev-browser sessions (state = page
   summary + candidate list; label = the action the current path took + whether the session
   succeeded). Capture only, no live runs.
2. Replay offline: Jev answers each frozen point. No side effects, no browser control.
3. Metrics: top-1 agreement with the action that actually led to success; abstention quality
   (low-confidence cases it should defer); latency per decision; cost per 1k decisions.
Pass bar to even discuss adoption: >=90% agreement with successful-path actions AND defers
on the cases the current path failed, at <10% of current lane cost.

## Lane 2: pre-filter scorer (gauntlet/UGC + GOAT lead scoring)

Question type: Score on the existing rubric (gauntlet verdict rubric; GOAT lead tiers).
Design:
1. Freeze 200 past judgments with their final verdicts (UGC review outcomes, GOAT lead outcomes).
2. Jev scores each frozen item; compare distribution vs the human/judge verdicts.
3. Metrics: rank correlation; false-pass rate (items Jev scores high that judges rejected -
   the number that matters for a pre-filter); cost per 1k.
Pass bar: false-pass rate <2% at a recall of >=80% on judge-approved items.

## Cost and authority

- TypeSafe API key: NOT in the vault. Getting one + any TypeSafe spend = his decision.
- If Jev appears on OpenRouter, probes run under the existing $3-capped key only.
- A full lane-1 replay at 100 points x ~2k tokens in is ~$0.01 at vendor pricing - cheap,
  but the key is still his call.
- Privacy: frozen states carry page summaries and rubric text only - no user data, no
  credentials, no donor/customer records in any eval payload.

## Exit criteria

Report to him with: agreement/false-pass numbers, latency, actual spend, and a clear
adopt / keep-watching / reject recommendation. Adoption is a separate explicit decision.
