# Stage 01 - Fetch (raw capture)

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Assignment | parent's task message | source identity + scope | what to mine |
| Existing index | ../../../knowledge-index.json | sources[] | avoid re-mining; extend instead |

## Process
1. Identify the source precisely (channel handle, URL list, file set). Record it.
2. Capture raw artifacts into output/raw/ - transcripts, pages, docs. Name files by source-native ID (video ID, message ID, doc slug).
3. Write output/manifest.json: every artifact, its source ID, fetch date, fetch status, and any gaps (rate limits, blocked items) with a retry note.
4. If the fetch is blocked partway, stop at the wall, record the exact stopping point, and report - do not fake completeness.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Raw artifacts | output/raw/ | source-native text |
| Manifest | output/manifest.json | json: id, status, gaps |

## Audit
- [ ] Every captured artifact has a source-native ID
- [ ] Gaps listed explicitly with retry plan
- [ ] No content modified from source
