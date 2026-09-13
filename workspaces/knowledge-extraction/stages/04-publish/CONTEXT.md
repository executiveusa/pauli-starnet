# Stage 04 - Publish (repo + index, same commit)

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Merged graph | ../03-graph-merge/output/graph.json | full file | durable record |
| Index record | ../03-graph-merge/output/index-record.json | full file | registration |
| Root index | ../../../KNOWLEDGE.md, ../../../knowledge-index.json | sources table / sources[] | the two registration points |

## Process
1. Place files at their canonical home: districts/<district>/<source>/ for district knowledge, or R2 pointer-only for bulk artifacts.
2. Register: append the index record to knowledge-index.json AND one row to the KNOWLEDGE.md sources table. Both, same commit - an unregistered source does not exist.
3. Write or update the district CONTEXT.md hook so agents in that district load the new base proactively (relevance table row + seat hooks).
4. Commit with a message naming the source, node counts, and gaps. Report the SHA.
5. External publishing (public wiki, landing, posts) is NOT this stage. It requires separate owner approval.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Commit | target branch | files + index + CONTEXT hooks together |
| Report | to parent | SHA, counts, gaps, pointer URLs |

## Audit
- [ ] Index and KNOWLEDGE.md updated in the same commit
- [ ] District CONTEXT hook added
- [ ] SHA reported with counts and honest gaps
