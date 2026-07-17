-- Migration 007: agent_cases table + Postgres NOTIFY trigger
-- Date: 2026-04-25
-- Adds case logging for invoke route + entity_changes pub/sub for SSE

-- ============================================================
-- 1) agent_cases — runtime case capture (input/output/timing)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_cases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  service_id   UUID REFERENCES agent_services(id) ON DELETE SET NULL,
  input_text   TEXT NOT NULL,
  output_text  TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'success',  -- success/error/timeout
  error_msg    TEXT,
  tokens_used  INTEGER,
  duration_ms  INTEGER NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_cases_agent ON agent_cases(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_cases_user
  ON agent_cases(user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- 2) Generic NOTIFY function — publishes to 'entity_changes'
-- ============================================================
CREATE OR REPLACE FUNCTION notify_entity_change() RETURNS trigger AS $$
DECLARE
  payload JSONB;
  rec     JSONB;
BEGIN
  rec := COALESCE(to_jsonb(NEW), to_jsonb(OLD));
  payload := jsonb_build_object(
    'table',    TG_TABLE_NAME,
    'op',       TG_OP,
    'id',       rec->'id',
    'user_id',  rec->'user_id',
    'agent_id', rec->'agent_id',
    'ts',       extract(epoch from now())
  );
  PERFORM pg_notify('entity_changes', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3) Attach trigger to entity tables
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'agents',
    'agent_services',
    'favorites',
    'marketplace_jobs',
    'bounties',
    'agent_cases'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_notify ON %s', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_notify
         AFTER INSERT OR UPDATE OR DELETE ON %s
         FOR EACH ROW EXECUTE FUNCTION notify_entity_change()',
      t, t
    );
  END LOOP;
END $$;
