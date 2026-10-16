# knowledge/ — the city knowledge base

One job: every transcript and distilled playbook we own is loaded into one database, routed to the districts
that use it, and answerable with citations. Knowledge that sits in a folder nobody queries is not knowledge.

## Inputs
- `sources.json`: the registry. One entry per source: where it lives (`status` + `location`), and one route per
  district with what that district uses it for. District ids must be CitySpec ids (`frontend/app/cityos.js`).
- The transcript folders named in `sources.json`, and the distilled graphs/canon files it points at.

## Process
1. `node scripts/knowledge/ingest.js --out build/knowledge.sql --manifest knowledge/MANIFEST.json`
2. `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/20261015_0001_knowledge.sql` (once; safe to re-run)
3. `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f build/knowledge.sql` (safe to re-run; replaces chunks, keeps reviews)
4. Sources on a server (`status: on_server`): run step 1 on that box with
   `--only <id> --dir <id>=<path>`, then step 3 there.

## Outputs
- Tables `kb_sources`, `kb_routes`, `kb_documents`, `kb_chunks`, `kb_insights` and the `kb_search()` function.
- `MANIFEST.json`: what the loader read from this repo (counts + content hash per source). The test fails when it
  drifts, so a changed transcript set is always a reviewed change.
- Agents ask the gateway: `GET /v1/knowledge/search?q=&district=`, `/v1/knowledge/insights?district=`,
  `/v1/knowledge/sources?district=` (gateway bearer). Answers name their backend: `supabase` or `files`.

## Rules
- Cite by source id + video id. A quote and an interpretation never share a field.
- Graph and canon imports land as `draft` insights. Only someone other than the writer marks one `reviewed`;
  the database refuses `reviewed_by = created_by`.
- A creator's numbers are their claims. Use them as sales ammunition, never as our published facts.
- New source: add it to `sources.json` (and to `KNOWLEDGE.md` for humans), regenerate `MANIFEST.json`, same commit.

## Human check
Ask a district a real question (for example Impact: "grant readiness") and read the cited passages.
