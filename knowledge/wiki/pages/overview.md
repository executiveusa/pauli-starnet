---
title: City knowledge brain - overview
updated: 2026-10-20
sources: mozi-sales, metricsmule-video, email-copywriter, jake-trinder-20, monica-main, cause-specialist, middleton-method
source_hashes:
  mozi-sales: 6460b2b87b91e74d01757ee666b539ef3e91e044b53246b5ab54026e966eeea8
  metricsmule-video: bbaf778c606f004ce7d5e7d58cf5228fbf926a1fd6f3fe65ed5467ab30cad27e
  email-copywriter: 50f9ad51fd3185194206356e1cafdd4fae4b4bc28e92511aab32139c67012fde
  jake-trinder-20: 321ffd294849d441c75f443ccbbffee15e62c9e75ade22a8a61924e32fd9506d
  monica-main: 42d5e685610b14ec3af8d033d55a5bc07cb15368794b904ea0406d844c8dc532
  cause-specialist: c8f2576ddf9d2167a91adf848370729e87830c363d1a82943dc66716fb9d8fd8
  middleton-method: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
---

# City knowledge brain - overview

One paragraph: this is the maintained map of what the city knows. Raw transcripts stay immutable in their sources; this wiki is the compiled layer agents read first. Ask the gateway, not the folder: `GET /v1/knowledge/search?q=&district=` returns wiki pages (kind `wiki`) ahead of raw passages, so there is exactly one place to look.

## What the brain holds

| Source | Districts | Docs | Chunks | Insights | Where |
|--------|-----------|------|--------|----------|-------|
| mozi-sales | revenue, commerce, command | 43 | 943 | 33 | indexed |
| manny-hormozi-315 | revenue | 0 | 0 | 0 | on_server |
| metricsmule-video | creative, commerce | 150 | 1140 | 15 | indexed |
| email-copywriter | creative, revenue | 143 | 913 | 0 | indexed |
| jake-trinder-20 | creative, revenue | 20 | 553 | 0 | indexed |
| monica-main | financial, impact | 40 | 676 | 40 | indexed |
| cause-specialist | impact | 40 | 319 | 40 | indexed |
| middleton-method | revenue | 0 | 0 | 10 | indexed |
| jasper-smart-sites | production, revenue | 0 | 0 | 0 | on_server |
| closer-sales-call-stages | revenue | 0 | 0 | 0 | external |
| stefan-3d | creative | 0 | 0 | 0 | external |
| androoagi-study | commerce | 0 | 0 | 0 | unlocated |
| seth-godin-books | pauli, revenue | 0 | 0 | 0 | on_server |

## Pages

- [[mozi-sales-doctrine]] - the 33-node Hormozi doctrine graph compiled to one page, cited by node id.

## How this layer stays honest

- Every page names its sources and the content hashes it was compiled from. `node scripts/knowledge/wiki.js lint` flags a page as stale the moment a source changes under it.
- Contradictions between sources are flagged inline and registered in [[../contradictions|contradictions.md]], never silently resolved.
- Everything that happens to this wiki lands in [[../log|log.md]] with a grep-able prefix.
