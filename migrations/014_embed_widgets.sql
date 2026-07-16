-- 014: Embed Widgets — 외부 사이트에 1줄 script로 임베드 가능한 AI 챗 위젯
-- 위젯 토큰(oaw_*)으로 인증하고 owner의 balance에서 비용 차감.

CREATE TABLE IF NOT EXISTS widgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           VARCHAR(64) UNIQUE NOT NULL,
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  agent_slug      VARCHAR(100),
  prompt_slug     VARCHAR(100),
  cors_origins    TEXT[] NOT NULL DEFAULT '{}',
  -- UI 설정
  welcome_message TEXT,
  primary_color   VARCHAR(20) DEFAULT '#0EA5E9',
  position        VARCHAR(20) DEFAULT 'bottom-right',
  -- 정책
  monthly_quota   INTEGER NOT NULL DEFAULT 1000,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  inject_page_context BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((agent_slug IS NOT NULL) OR (prompt_slug IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_widgets_owner ON widgets(owner_id);
CREATE INDEX IF NOT EXISTS idx_widgets_token_active ON widgets(token) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS widget_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id    UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  session_id   VARCHAR(64) NOT NULL,
  origin       TEXT,
  user_message TEXT NOT NULL,
  assistant_message TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'success',
  error_msg    TEXT,
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  cost_usdc    NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widget_runs_widget ON widget_runs(widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_runs_session ON widget_runs(widget_id, session_id, created_at);

DROP TRIGGER IF EXISTS trg_widgets_updated ON widgets;
CREATE TRIGGER trg_widgets_updated BEFORE UPDATE ON widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_widgets_notify ON widgets;
CREATE TRIGGER trg_widgets_notify AFTER INSERT OR UPDATE OR DELETE ON widgets
  FOR EACH ROW EXECUTE FUNCTION notify_entity_change();

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO masterplan;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO masterplan;

-- reward_config: 위젯 호출당 비용 (기본 0.01 USDC)
INSERT INTO reward_config (id, value, description) VALUES
  ('widget_cost_per_call_usdc', 0.01, '임베드 위젯 호출 1건당 owner 차감 USDC')
ON CONFLICT (id) DO NOTHING;

-- 시드 위젯 (개발용)
DO $$
DECLARE
  admin_id UUID;
  agent_seed_slug TEXT;
BEGIN
  SELECT id INTO admin_id FROM users WHERE email = '1@openagentx.org' LIMIT 1;
  IF admin_id IS NULL THEN
    RETURN;
  END IF;

  -- 사용 가능한 active agent 또는 prompt 의 slug 1개 채택
  SELECT slug INTO agent_seed_slug FROM agents WHERE status = 'active' ORDER BY ranking_score DESC LIMIT 1;

  IF agent_seed_slug IS NULL THEN
    -- agent 가 없으면 prompt slug 사용
    INSERT INTO widgets (token, owner_id, name, prompt_slug, cors_origins, welcome_message, monthly_quota, primary_color)
    SELECT
      'oaw_demo_test12345',
      admin_id,
      'Demo Widget (개발용)',
      slug,
      ARRAY['*'],
      '안녕하세요! 무엇을 도와드릴까요?',
      100,
      '#0EA5E9'
    FROM prompts
    WHERE status = 'active' AND is_public = TRUE
    ORDER BY is_featured DESC, use_count DESC
    LIMIT 1
    ON CONFLICT (token) DO NOTHING;
  ELSE
    INSERT INTO widgets (token, owner_id, name, agent_slug, cors_origins, welcome_message, monthly_quota, primary_color)
    VALUES (
      'oaw_demo_test12345',
      admin_id,
      'Demo Widget (개발용)',
      agent_seed_slug,
      ARRAY['*'],
      '안녕하세요! 무엇을 도와드릴까요?',
      100,
      '#0EA5E9'
    )
    ON CONFLICT (token) DO NOTHING;
  END IF;
END $$;
