# Knowledge Extraction - city workspace (ICM)

What do I do? Turn a new source (channel, book set, doc pile, chat export) into index-ready city knowledge. Sequential pipeline; each stage's output is the next stage's input. A human may edit any output/ file before the next stage runs - the system picks up the edit.

## Stages

| Stage | Folder | Output |
|-------|--------|--------|
| 01 | stages/01-fetch/ | raw capture + manifest in output/ |
| 02 | stages/02-mine/ | mined nodes/notes, verbatim vs interpretation split |
| 03 | stages/03-graph-merge/ | merged graph + updated index records |
| 04 | stages/04-publish/ | commit-ready file set + KNOWLEDGE.md/index diff |

## Rules

1. Follow _core ICM conventions: one-way references, canonical sources, cite-by-ID, docs over outputs.
2. Every record carries source provenance (video ID / doc path / message ID). No orphan claims.
3. Verbatim evidence and interpretation are separate fields. Never blend.
4. Nothing publishes externally from this workspace. Output is repo files + (when large) R2 artifacts; publishing is a separate approved act.
5. When done, the source appears in KNOWLEDGE.md + knowledge-index.json in the same commit as its files.
