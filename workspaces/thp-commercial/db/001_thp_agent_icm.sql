-- THP ICM v1: applied ONLY to a dedicated THP Supabase project after THP bid migrations 001-004.
-- Separate authorization from conversation. Do not execute in shared botanic-creations.
BEGIN;
CREATE SCHEMA IF NOT EXISTS thp_agent_private;
REVOKE ALL ON SCHEMA thp_agent_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA thp_agent_private TO service_role;
CREATE TABLE IF NOT EXISTS thp_agent_private.operator_identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_key text NOT NULL UNIQUE,
 channel text NOT NULL CHECK (channel IN ('whatsapp_cloud','whatsapp_hermes','agent_chat','apple_messages')),
 sender_hmac text NOT NULL CHECK (sender_hmac ~ '^[a-f0-9]{64}$'),
 active boolean NOT NULL DEFAULT false,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(channel,sender_hmac),
 CHECK ((NOT active) OR verified_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS thp_agent_private.company_facts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fact_key text NOT NULL,
 version integer NOT NULL CHECK (version > 0),
 fact_value jsonb NOT NULL,
 provenance text NOT NULL CHECK (length(provenance) BETWEEN 2 AND 800),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','retired')),
 approved_by uuid REFERENCES thp_agent_private.operator_identities(id),
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(fact_key,version),
 CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS thp_approved_fact_one_current
 ON thp_agent_private.company_facts (fact_key) WHERE status='approved';
CREATE TABLE IF NOT EXISTS thp_agent_private.intent_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 channel text NOT NULL,
 provider_message_id text NOT NULL CHECK (length(provider_message_id) BETWEEN 3 AND 220),
 actor_id uuid NOT NULL REFERENCES thp_agent_private.operator_identities(id),
 message_digest text NOT NULL CHECK (message_digest ~ '^[a-f0-9]{64}$'),
 classified_intent text NOT NULL DEFAULT 'pending',
 state text NOT NULL DEFAULT 'received' CHECK (state IN ('received','accepted','needs_approval','completed','failed','rejected')),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 UNIQUE(channel,provider_message_id)
);
CREATE INDEX IF NOT EXISTS thp_intent_time_idx ON thp_agent_private.intent_inbox (occurred_at DESC);
CREATE TABLE IF NOT EXISTS thp_agent_private.work_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 intent_id uuid REFERENCES thp_agent_private.intent_inbox(id),
 lead_id uuid REFERENCES thp_private.leads(id),
 node_key text NOT NULL,
 input_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
 output_ref jsonb,
 state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','waiting_approval','blocked','complete','failed','cancelled')),
 human_check_required boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS thp_work_state_idx ON thp_agent_private.work_items (state,created_at);
CREATE TABLE IF NOT EXISTS thp_agent_private.approval_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 work_item_id uuid NOT NULL REFERENCES thp_agent_private.work_items(id),
 actor_id uuid NOT NULL REFERENCES thp_agent_private.operator_identities(id),
 action_hash text NOT NULL CHECK (action_hash ~ '^[a-f0-9]{64}$'),
 action_description text NOT NULL CHECK (length(action_description) <= 500),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','approved','rejected','expired')),
 expires_at timestamptz NOT NULL,
 decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((state='pending' AND decided_at IS NULL) OR (state<>'pending' AND decided_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS thp_approvals_work_idx ON thp_agent_private.approval_requests (work_item_id,state);
CREATE TABLE IF NOT EXISTS thp_agent_private.action_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 intent_id uuid REFERENCES thp_agent_private.intent_inbox(id),
 work_item_id uuid REFERENCES thp_agent_private.work_items(id),
 action_key text NOT NULL UNIQUE,
 action_type text NOT NULL,
 approved_by uuid REFERENCES thp_agent_private.approval_requests(id),
 result_state text NOT NULL CHECK (result_state IN ('prepared','blocked','provider_accepted','provider_rejected','delivered','failed','cancelled')),
 provider_name text,
 provider_receipt text,
 completed_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS thp_receipts_intent_idx ON thp_agent_private.action_receipts (intent_id,recorded_at);
CREATE TABLE IF NOT EXISTS thp_agent_private.agent_events (
 id bigserial PRIMARY KEY,
 intent_id uuid REFERENCES thp_agent_private.intent_inbox(id),
 work_item_id uuid REFERENCES thp_agent_private.work_items(id),
 event_type text NOT NULL,
 event_json jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS thp_agent_events_intent_idx ON thp_agent_private.agent_events (intent_id,created_at);
-- Strictly append-only event ledger, even for the service role.
CREATE OR REPLACE FUNCTION thp_agent_private.prevent_event_mutation() RETURNS trigger
 LANGUAGE plpgsql SET search_path = '' AS $$
 BEGIN RAISE EXCEPTION 'immutable_agent_event' USING ERRCODE='22023'; END $$;
DROP TRIGGER IF EXISTS thp_agent_events_immutable ON thp_agent_private.agent_events;
CREATE TRIGGER thp_agent_events_immutable BEFORE UPDATE OR DELETE
 ON thp_agent_private.agent_events FOR EACH ROW EXECUTE FUNCTION thp_agent_private.prevent_event_mutation();
DO $$
 DECLARE rec record;
 BEGIN
  FOR rec IN SELECT format('%I.%I',n.nspname,c.relname) full_name FROM pg_class c
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='thp_agent_private' AND c.relkind IN ('r','p')
  LOOP EXECUTE 'ALTER TABLE '||rec.full_name||' ENABLE ROW LEVEL SECURITY';
   EXECUTE 'REVOKE ALL ON '||rec.full_name||' FROM PUBLIC, anon, authenticated';
   EXECUTE 'GRANT SELECT,INSERT,UPDATE,DELETE ON '||rec.full_name||' TO service_role';
  END LOOP;
 END $$;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA thp_agent_private TO service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA thp_agent_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA thp_agent_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION thp_agent_private.prevent_event_mutation() TO service_role;
-- RLS is enabled without permissive visitor policies. Server-side service_role only.
DO $$
 DECLARE rec record;
 BEGIN
  IF has_schema_privilege('anon','thp_agent_private','USAGE')
      OR has_schema_privilege('authenticated','thp_agent_private','USAGE') THEN
    RAISE EXCEPTION 'thp_agent_private_schema_exposed';
  END IF;
  FOR rec IN SELECT c.oid,format('%I.%I',n.nspname,c.relname) full_name FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='thp_agent_private' AND c.relkind IN ('r','p')
  LOOP
    IF has_table_privilege('anon',rec.oid,'SELECT') OR has_table_privilege('authenticated',rec.oid,'SELECT')
       OR has_table_privilege('anon',rec.oid,'INSERT') OR has_table_privilege('authenticated',rec.oid,'INSERT') THEN
      RAISE EXCEPTION 'private_table_exposed: %',rec.full_name;
    END IF;
  END LOOP;
 END $$;
COMMIT;
