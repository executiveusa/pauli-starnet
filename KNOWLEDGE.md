# KNOWLEDGE - the city-wide callable knowledge layer

Where am I? The root index of every knowledge base in the city. Any agent, any district: read this file first when a task touches sales, offers, video, UGC, or prompting. Follow the pointer, read the source's CONTEXT.md / README contract, then load only what the task needs. Never load whole archives.

Method: ICM (Interpretable Context Methodology, Jake Van Clief - github.com/RinDig/Interpretable-Context-Methodology). Files are the database. Two byte homes, one index:

| Home | What lives there |
|------|------------------|
| This repo | Knowledge graphs, playbooks, contracts, district packages (e.g. districts/sales/mozi/) |
| R2 (video-exports.thepaulieffect.com) | Large raw artifacts: transcript archives, catalogs, sample exports (knowledge/ prefix) |

Machine-readable index: `knowledge-index.json` (same directory as this file). It lists every source, its entry points, its tags, and its node/record listings. Query pattern: grep the index by tag or stage -> open the pointer -> read the cited section or node, not the whole file.

## Registered sources

| ID | District | Home | What it is | Start at |
|----|----------|------|------------|----------|
| mozi-sales | sales | repo | Hormozi doctrine graph (33 nodes), 5 playbooks, 43 transcripts | districts/sales/mozi/README.md |
| metricsmule-video | creative | repo (+ r2 mirror) | 150-video prompt-engineering mine: 15-node graph, 5 playbooks, 150 transcripts | districts/creative/video/README.md |

## Rules

1. Cite by node ID or source ID + video ID. Verbatim evidence and interpretation stay separated when you cite.
2. One home per fact. If a rule lives in a playbook, point at it - never copy it into a new file.
3. New extractions land through workspaces/knowledge-extraction/ (4-stage pipeline) so they arrive index-ready.
4. Adding a source = append to knowledge-index.json + one row here. Both, same commit.
