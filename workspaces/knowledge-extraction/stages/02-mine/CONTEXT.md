# Stage 02 - Mine (evidence vs interpretation)

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Raw capture | ../01-fetch/output/raw/ | full set | mining material |
| Manifest | ../01-fetch/output/manifest.json | gaps | never mine past what was fetched |

## Process
1. Read raw artifacts; extract doctrines, frameworks, patterns, and procedures.
2. For each candidate record write TWO fields: evidence_verbatim (exact source words + source ID) and summary_interpretation (our synthesis). This separation is the standing evidence rule.
3. Tag each record with workflow stages it applies to (define the stage list for this source type; reuse an existing graph's stages when extending one).
4. Note edges between records (supports, contradicts, extends).
5. Checkpoint: present the record list to the reviewer before merge.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Mined records | output/mined-records.json | per-record: id, name, type, applies, edges, evidence_verbatim, summary_interpretation |
| Read notes | output/read-notes.md | md, one section per artifact |

## Audit
- [ ] Every record has verbatim evidence with source ID
- [ ] Interpretation never quoted as source words
- [ ] Stage tags from the declared list only
