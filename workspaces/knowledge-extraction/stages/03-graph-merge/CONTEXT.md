# Stage 03 - Graph merge (attach, don't duplicate)

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Mined records | ../02-mine/output/mined-records.json | full file | merge candidates |
| Target graph | per assignment (e.g. districts/sales/mozi/knowledge/hormozi-knowledge-graph.json) | nodes[] + meta | existing structure wins |

## Process
1. Node schema (owned with the Mozi lane; extend, don't fork): id, name, type, applies[], edges[], evidence_verbatim[], summary_interpretation. Top level: meta, nodes, workflow_stages, test_loop_rule.
2. For each mined record: if an existing node covers the doctrine, ATTACH the new evidence to that node's evidence_verbatim. Add a node only for a genuinely new doctrine.
3. New node IDs: kebab-case, source-prefixed when the source is new to the graph.
4. Update meta: fetched counts, fetch status, provenance notes, date.
5. If the source is large/raw-heavy, put bulk artifacts on R2 (video-exports.thepaulieffect.com/knowledge/<source-id>/) and point at them - repo holds graphs, contracts, and playbooks.

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Merged graph | output/graph.json | schema above |
| Index record | output/index-record.json | one sources[] entry for knowledge-index.json |
| R2 manifest | output/r2-manifest.json | when bulk artifacts went to R2: keys + URLs |

## Audit
- [ ] No duplicate doctrines (attach > add)
- [ ] Every new node has verbatim evidence
- [ ] meta fetch status is honest about gaps
