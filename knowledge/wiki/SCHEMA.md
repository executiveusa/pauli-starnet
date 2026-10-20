# SCHEMA - how the city wiki works (read before touching knowledge/wiki/)

The pattern: Karpathy's LLM Wiki (gist.github.com/karpathy/442a6bf555914893e9891c11519de94f),
fitted onto the existing city knowledge base. Nothing here replaces the database or the transcripts;
this adds the missing middle layer and the discipline that keeps it true.

## The three layers

1. **Raw** - the transcripts, graphs, and canon files registered in `knowledge/sources.json`, chunked
   into `kb_chunks` by `scripts/knowledge/ingest.js`. Immutable. The loader replaces chunks; no agent
   ever edits a raw transcript. This is the source of truth.
2. **Wiki** - `knowledge/wiki/pages/`. Compiled, interlinked markdown the agents write and maintain.
   A page synthesizes; it never copies raw text wholesale. When a new source lands or an old one
   changes, the pages that draw on it get UPDATED in the same commit, not appended and forgotten.
3. **Schema** - this file. The contract that makes an agent a disciplined wiki maintainer.

## Page format

Every page in `pages/` starts with frontmatter:

```
---
title: Human name
updated: YYYY-MM-DD
sources: mozi-sales, metricsmule-video     # source ids from knowledge/sources.json, or "wiki"
source_hashes:
  mozi-sales: <content_sha256 from knowledge/MANIFEST.json at compile time>
---
```

Body rules:
- Cite by source id + node id / video id, same as the rest of the city. Interpretation and verbatim
  evidence never share a sentence without the quote being marked as a quote.
- Link pages with `[[page-name]]`. If a fact already has a home, link to it - never restate it
  (city rule: one home per fact).
- A creator's numbers are their claims, not our published facts (existing city rule, unchanged).

## Operations

**Ingest.** New source lands through `workspaces/knowledge-extraction/` as today. Then, same commit:
the ingestor updates every wiki page that the new source touches (or writes the page if none exists),
registers the page in `index.md`, and appends to `log.md`. A source is not ingested until the wiki
reflects it.

**Query.** Agents ask the gateway, never the folder: `GET /v1/knowledge/search?q=&district=`.
Wiki pages come back first with `kind: "wiki"`, raw passages after with their citations - one
endpoint, one place to look. A good answer worth keeping gets filed back as a wiki page (or merged
into the page it extends) in the same commit as the work that produced it.

**Lint.** `node scripts/knowledge/wiki.js lint` and it runs in the fast test gate:
- error: page missing from `index.md`, index entry with no page, missing/broken frontmatter,
  a `CONTRADICTION[C-nnn]` marker with no register entry, a malformed `log.md` line.
- warning: **stale page** (a source's hash in MANIFEST.json differs from the page's
  `source_hashes` - the source moved under the page, recompile it), **orphan page** (nothing links
  to it), open contradictions.

## Contradictions

When two sources disagree, or a new source contradicts a compiled page: mark it inline where the
claim lives with `CONTRADICTION[C-nnn]: <the two claims>`, register C-nnn in `contradictions.md`
with status `open`, and keep both claims visible with their citations. Resolving a contradiction
is a reviewed act: mark it `resolved` in the register with how it was settled and by whom. Never
silently overwrite the older claim.

## index.md and log.md

- `index.md` - every page, one line each, grouped by kind (overviews, doctrines, playbooks,
  comparisons). Updated on every ingest.
- `log.md` - append-only, every entry `## [YYYY-MM-DD] op | subject` where op is
  ingest | query-filed | lint | update. Grep-able: `grep "^## \[" log.md | tail -5`.

## What this layer is NOT

- Not a second knowledge base. The database, the gateway, and the extraction pipeline stay exactly
  where they are. The wiki is their compiled face.
- Not a dumping ground. No raw transcripts, no whole-doc copies, no unsourced claims.
- Not edited by hand-waving: every change rides the fast gate (lint + drift test), same as code.
