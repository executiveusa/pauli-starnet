# A/B Test Designs - the standing experiment ledger

Owner: Taishan (experiment strategy). Rule (owner directive 2026-09-13): stick to the Hormozi spine and TEST whether it works. Every doctrine we apply ships as an experiment with a metric and a result. Results feed graph confidence; Owl reviews weekly.

Format per test: hypothesis > node ids > variant A / variant B > metric > minimum sample > decision rule > result.

## Standing test queue (from the mined doctrines)

1. **VIP-first vs standard-first.** Node: `start-high-tiering`. A: present VIP tier first. B: present standard first. Metric: revenue per call + tier mix. Decision: keep VIP-first unless revenue/call drops >10%.
2. **Price cap vs no cap.** Node: `price-cap-risk-reversal`. A: quote with "will not exceed" cap. B: open estimate. Metric: close rate on quoted jobs.
3. **Same-day surcharge.** Node: `speed-premium`. A: 10% surcharge. B: 20%. Metric: take rate vs surcharge revenue per job. Walk up until take rate breaks.
4. **Upsell timing.** Node: `sell-during-delivery`. A: ask at halfway + two-thirds + end. B: ask at end only. Metric: backend attach rate (expect ~1/3 at-end vs 1/2+ during, per 8VqSFBMMS4M).
5. **VSL before call.** Node: `vsl-before-call`. A: VSL sent 24h before. B: no VSL. Metric: call-to-close rate, call length, objection count.
6. **Live price vs emailed price.** Node: `never-email-invoice`. A: price presented on call. B: emailed proposal. Metric: close rate within 7 days.
7. **Checkout vs 1:1 convenience premium.** Node: `checkout-convenience-premium`. A: base checkout + premium human path. B: single checkout. Metric: checkout completion + blended margin.
8. **Opt-out renewal vs opt-in.** Node: `opt-out-billing`. Metric: cycle-2 retention. (Implement with clear consent copy; the point is default-continuation, not dark patterns.)
9. **Guarantee framing.** Node: `guarantee-reframe`. A: plain 3-day terms. B: hidden-objector framing. Metric: same-day close rate where partner is absent.
10. **FAQ-by-frequency webinar close.** Nodes: `structured-pitch-architecture`, `faq-by-frequency`. A: structured 45-min webinar + live FAQ by frequency. B: unstructured long session. Metric: conversion (baseline ~9-10% warm in source case; target double on warm, prove on cold).

## Test hygiene

- One variable per test. Freeze everything else.
- Record buyer verbatims heard during the test - they feed the pain inventory back (`pain-first-research`).
- Losers get written up too. A losing Hormozi doctrine in our market is a graph update, not a failure to hide.

## Retention tests (from the churn doctrine cluster, -j8_YCWZ05Q)

11. **Fast-win onboarding.** Node: `front-load-the-win`. A: sticky item + fast win pinned in first 24h. B: standard linear onboarding. Metric: day-30 retention (target: beat the 20%+ month-1 churn band).
12. **Subtraction sprint.** Nodes: `overwhelm-kills-retention`, `ask-why-they-stay`. A: cut to the fight-for-it features only. B: status quo. Metric: month-over-month churn (source case: 30% -> 5%).
13. **Cancel-reason tagging.** Node: `cancel-reason-loop`. Instrument the DM script + reason sheet; fix top 2 reasons per 20 cancels. Metric: churn trend over 3 cycles.
14. **Lower-tier rescue.** Node: `price-tier-evidence`. A: cheaper tier for ideal-buyer price complaints. B: none. Metric: save rate on price-driven cancels vs downgraded LTV.
