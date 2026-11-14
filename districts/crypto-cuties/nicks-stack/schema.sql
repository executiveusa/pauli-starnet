-- Apply only to an owner-controlled PostgreSQL instance after access review.
-- Application role must have no BYPASSRLS or table ownership.
CREATE SCHEMA IF NOT EXISTS cuties;
CREATE TABLE IF NOT EXISTS cuties.agents (
  id text PRIMARY KEY CHECK (id IN ('cc001','cc002','cc003','cc004','cc005')),
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','ready')),
  canon_ref text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cuties.memory (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id text NOT NULL REFERENCES cuties.agents(id),
  kind text NOT NULL CHECK (kind IN ('fact','draft','receipt','decision')),
  body jsonb NOT NULL,
  provenance text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cuties_memory_agent_recent ON cuties.memory(agent_id, created_at DESC);
INSERT INTO cuties.agents(id) VALUES ('cc001'),('cc002'),('cc003'),('cc004'),('cc005') ON CONFLICT DO NOTHING;
ALTER TABLE cuties.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuties.memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuties.agents FORCE ROW LEVEL SECURITY;
ALTER TABLE cuties.memory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_scope ON cuties.agents;
CREATE POLICY agent_scope ON cuties.agents USING (id = nullif(current_setting('cuties.agent_id', true), '')) WITH CHECK (id = nullif(current_setting('cuties.agent_id', true), ''));
DROP POLICY IF EXISTS memory_scope ON cuties.memory;
CREATE POLICY memory_scope ON cuties.memory USING (agent_id = nullif(current_setting('cuties.agent_id', true), '')) WITH CHECK (agent_id = nullif(current_setting('cuties.agent_id', true), ''));
-- Grant only SELECT, INSERT on memory and SELECT on agents to a separate non-owner app role.
-- Keep all human identity data out until rights and roster are confirmed.
