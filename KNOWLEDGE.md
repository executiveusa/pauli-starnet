# KNOWLEDGE - the city-wide callable knowledge layer

Where am I? The root index of every knowledge base in the city. Any agent, any district: read this file first when a task touches sales, offers, video, UGC, or prompting. Follow the pointer, read the source's CONTEXT.md / README contract, then load only what the task needs. Never load whole archives.

Method: ICM (Interpretable Context Methodology, Jake Van Clief - github.com/RinDig/Interpretable-Context-Methodology). Files are the database. Two byte homes, one index:

| Home | What lives there |
|------|------------------|
| This repo | Knowledge graphs, playbooks, contracts, district packages (e.g. districts/sales/mozi/) |
| R2 (video-exports.thepaulieffect.com) | Large raw artifacts: transcript archives, catalogs, sample exports (knowledge/ prefix) |

Database: every source below (plus server-held and missing ones) is registered in `knowledge/sources.json`, loaded into the self-hosted Supabase by `scripts/knowledge/ingest.js`, and queried through the gateway (`/v1/knowledge/search?q=&district=`). Contract: `knowledge/CONTEXT.md`.

Machine-readable node index: `knowledge-index.json` (same directory as this file). It lists every source, its entry points, its tags, and its node/record listings. Query pattern: grep the index by tag or stage -> open the pointer -> read the cited section or node, not the whole file.

## Registered sources

| ID | District | Home | What it is | Start at |
|----|----------|------|------------|----------|
| mozi-sales | sales | repo | Hormozi doctrine graph (33 nodes), 5 playbooks, 43 transcripts | districts/sales/mozi/README.md |
| metricsmule-video | creative | repo (+ r2 mirror) | 150-video prompt-engineering mine: 15-node graph, 5 playbooks, 150 transcripts | districts/creative/video/README.md |
| closer-sales-call-stages | sales | external repo (pauli-command-center @ 93da3853f6) | CLOSER call-stage doc + verbatim evidence (video ZMW8AfQeGqQ) | pcc:docs/CLOSER-SALES-CALL-STAGES.md |
| middleton-method | middleton | repo | JP Middleton local-business method: service sequence, scripts, metrics. His numbers are unverified claims; the 4+ review gate and raffle scripts are quoted source, not approved practice | districts/middleton/README.md |
| email-copywriter | creative | repo | Email copy knowledge base (@dragualin, 149 transcripts). Creator claims unverified; install candidate, drafting and review only | districts/creative/email-copywriter/CONTEXT.md |
| jake-trinder-20 | creative | repo | Jake Trinder educational YouTube channel system (20 transcripts) | knowledge/sources.json |
| monica-main | financial, impact | repo | Monica Main business credit and funding (40 transcripts) | impact/source-intel/transcript-research/ |
| cause-specialist | impact | repo | Joanne Toller nonprofit fundraising (40 transcripts) | impact/source-intel/transcript-research/ |
| jasper-smart-sites | production, revenue | server (NEW box) | Jasper smart-site pitch/offer logic (50 transcripts) | knowledge/sources.json |
| manny-hormozi-315 | revenue | server (old box) | Hormozi canonical long-form, 315 transcripts | knowledge/sources.json |
| stefan-3d | creative | external repo (impact-city-2026) | Stefan 3D Blender workflow synthesis | knowledge/sources.json |

## Rules

1. Cite by node ID or source ID + video ID. Verbatim evidence and interpretation stay separated when you cite.
2. One home per fact. If a rule lives in a playbook, point at it - never copy it into a new file.
3. New extractions land through workspaces/knowledge-extraction/ (4-stage pipeline) so they arrive index-ready.
4. Adding a source = append to knowledge-index.json + one row here. Both, same commit.
