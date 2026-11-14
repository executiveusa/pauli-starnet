-- StarNet city knowledge base (knowledge/CONTEXT.md). Target: the self-hosted Supabase Postgres.
-- Safe to run twice. Writes are service-role only; agents read through kb_search() over PostgREST
-- (POST /rest/v1/rpc/kb_search). Full-text search only: no pgvector needed to start.

BEGIN;

CREATE TABLE IF NOT EXISTS kb_sources (
  id          text PRIMARY KEY,
  tenant      text NOT NULL DEFAULT 'bambu',
  title       text NOT NULL,
  creator     text,
  status      text NOT NULL CHECK (status IN ('indexed', 'on_server', 'external', 'unlocated')),
  location    text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_routes (
  source_id   text NOT NULL REFERENCES kb_sources(id) ON DELETE CASCADE,
  district    text NOT NULL,
  use_for     text NOT NULL,
  PRIMARY KEY (source_id, district)
);

CREATE TABLE IF NOT EXISTS kb_documents (
  id           bigserial PRIMARY KEY,
  source_id    text NOT NULL REFERENCES kb_sources(id) ON DELETE CASCADE,
  external_id  text NOT NULL,             -- YouTube video id, or file name when there is none
  title        text,
  url          text,
  sha256       text NOT NULL,
  char_count   integer NOT NULL,
  ingested_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS kb_chunks (
  document_id  bigint NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  ord          integer NOT NULL,
  body         text NOT NULL,
  tsv          tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED,
  PRIMARY KEY (document_id, ord)
);
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks USING gin (tsv);

-- Distilled, citable knowledge a district acts on. A draft becomes 'reviewed' only by someone other than
-- the agent that wrote it: the builder never verifies its own work.
CREATE TABLE IF NOT EXISTS kb_insights (
  id           text PRIMARY KEY,           -- '<source_id>:<node_id>'
  source_id    text NOT NULL REFERENCES kb_sources(id) ON DELETE CASCADE,
  district     text NOT NULL,
  kind         text NOT NULL,              -- framework | doctrine | playbook | rule | offer | checklist
  title        text NOT NULL,
  body         text NOT NULL,
  evidence     jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{ "video_id": "...", "quote": "..." }]
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'rejected')),
  created_by   text NOT NULL,
  reviewed_by  text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'draft' OR (reviewed_by IS NOT NULL AND reviewed_by <> created_by))
);
CREATE INDEX IF NOT EXISTS kb_insights_district_idx ON kb_insights (district, status);

-- One call for agents: what does this district know about <query>? Ranked passages with citations,
-- limited to sources routed to that district (pass NULL for city-wide).
CREATE OR REPLACE FUNCTION kb_search(p_query text, p_district text DEFAULT NULL, p_limit integer DEFAULT 8)
RETURNS TABLE (source_id text, external_id text, title text, url text, snippet text, rank real)
LANGUAGE sql STABLE AS $$
  SELECT d.source_id, d.external_id, d.title, d.url,
         ts_headline('english', c.body, q, 'MaxFragments=2, MinWords=12, MaxWords=40') AS snippet,
         ts_rank(c.tsv, q) AS rank
  FROM kb_chunks c
  JOIN kb_documents d ON d.id = c.document_id
  CROSS JOIN websearch_to_tsquery('english', p_query) q
  WHERE c.tsv @@ q
    AND (p_district IS NULL OR d.source_id IN (SELECT r.source_id FROM kb_routes r WHERE r.district = p_district))
  ORDER BY rank DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50)
$$;

ALTER TABLE kb_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_routes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_insights ENABLE ROW LEVEL SECURITY;

-- Supabase roles exist on the real server; a plain Postgres (tests, a fresh box) skips the grants.
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    FOREACH t IN ARRAY ARRAY['kb_sources', 'kb_routes', 'kb_documents', 'kb_chunks', 'kb_insights'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read', t);
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', t || '_read', t);
      EXECUTE format('GRANT SELECT ON %I TO authenticated', t);
    END LOOP;
    GRANT EXECUTE ON FUNCTION kb_search(text, text, integer) TO authenticated;
    REVOKE EXECUTE ON FUNCTION kb_search(text, text, integer) FROM anon, public;
  END IF;
END $$;

COMMIT;
