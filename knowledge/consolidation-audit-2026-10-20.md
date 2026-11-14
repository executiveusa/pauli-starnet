# Knowledge-brain consolidation audit - 2026-10-20

Where else does knowledge-brain code live across our repos, and what should happen to each.
The city knowledge base in THIS repo (`knowledge/` + gateway + wiki) is the one brain. Nothing below
was deleted or changed; each item is a numbered pick for Bambu. Verified by reading the files on
2026-10-20 (GitHub, default branches).

## Duplicates and competitors (pick one per row)

1. **macs-agent-portal: `services/second-brain-worker/` + `deploy/maxx/seed-second-brain-vault.sh` + `services/hermes-runtime/profile/skills/maxx-second-brain/`** -
   a whole second brain: a Python worker that chunks uploaded documents into a Supabase bucket
   ("maxx-second-brain"). This is the MAXX stack Bambu ordered ditched on 2026-10-15; the repo is
   its GitHub backup. Proposed: archive the repo (read-only), no deletion. The city KB supersedes it.
2. **terabithia: `icm/KNOWLEDGE_ARCHITECTURE.md` + `bridge/adapters/knowledge/engine.ts`** -
   a competing "Knowledge Plane" design (tiered provenance T1-T7) with its own engine adapter.
   Keep/scrap of terabithia is already Bambu's open question. Proposed: scrap with the rest of the
   terabithia decision; the provenance-tier idea is already covered by our cite-by-source rules and
   the wiki SCHEMA.
3. **kupuri-media-cdmx `apps/control-room/src/lib/council.ts` vs SYNTHIA-3.1 `03-brain/apps/control-room/src/lib/council.ts`** -
   the same LLM-council file in two repos (identical headers and types). Proposed: pick ONE canonical
   home (suggest SYNTHIA-3.1, the active lane), delete the other copy. Note: Kupuri lane is shared
   work - confirm with that side before deleting.
4. **PAULIS-PLACE: `backend/agents/council_agent.py`, `council_adversarial.py`, `portfolio_council.py`, `icm/instructions/COUNCIL.md`** -
   the original of the council canon pauli-starnet imported 2026-09-13. Proposed: keep as read-only
   historical source (our canon header cites its commit); the living copy is in pauli-starnet.
   Do not edit either direction without a canon PR here.
5. **archonx-os: `archon/agents/hermes/white_council.py` / `black_council.py`** -
   Archon X was ruled OUT in the 2026-09-27 consolidation decision. Proposed: archive repo.
6. **the-pauli-effect: `0_KNOWLEDGE_BASE/`** - static Dec-2024 Google Drive inventory docs, not a
   live brain. Proposed: leave as historical docs; no code conflict.

## Looked at, NOT duplicates (no action)

7. **UJIMA `icm/workspaces/mission-os-client-factory/stages/02_knowledge_ingestion/`** - client
   onboarding reference docs for tenant workspaces. Different job (per-client config, not a brain).
8. **Ivette-lane second brains** (`kupuri-metamorphsis-second-brain`, `metamorphsis-cdmx
   ivette_second_brain_mvp/`, `Cheggie-trade-V2 .../second-brain/store.ts`) - a separate person's
   product lane, not our fleet's brain. Listed for awareness only.
9. **Vendored upstream KB code** (crewAI bedrock tools, litellm RAG inside pauli-comic-funnel) -
   third-party library code that shipped with imports, not our knowledge brain. Ignore.

## The rule after consolidation

Agents query ONE brain: `GET /v1/knowledge/search` on the city gateway (wiki pages first, then raw
passages, both cited). If a new repo or lane starts growing its own knowledge store, it registers as
a source in `knowledge/sources.json` through the extraction workspace instead of building a parallel
brain.
