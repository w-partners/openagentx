-- migration 015: Visual Workflow Builder
-- Defines workflows (graph definition) + workflow_runs (execution history)

CREATE TABLE IF NOT EXISTS workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(100) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- definition: { nodes: [{id, type:'input'|'agent'|'prompt'|'output', data:{slug?,position}}], edges: [{from,to}] }
  definition    JSONB NOT NULL,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  use_count     INTEGER NOT NULL DEFAULT 0,
  category      VARCHAR(50) DEFAULT 'general',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflows_owner ON workflows(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflows_public ON workflows(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_workflows_featured ON workflows(is_featured) WHERE is_featured = TRUE;

CREATE TABLE IF NOT EXISTS workflow_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  input_text   TEXT NOT NULL,
  output_text  TEXT,
  -- step_results: { node_id: { status, output, duration_ms, error? } }
  step_results JSONB NOT NULL DEFAULT '{}',
  status       VARCHAR(20) NOT NULL DEFAULT 'running',  -- running/success/error
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_wf ON workflow_runs(workflow_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_workflows_updated ON workflows;
CREATE TRIGGER trg_workflows_updated BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_workflows_notify ON workflows;
CREATE TRIGGER trg_workflows_notify AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION notify_entity_change();

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO masterplan;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO masterplan;

-- Seed: code review pipeline
INSERT INTO workflows (slug, name, description, owner_id, definition, is_public, is_featured, category)
VALUES (
  'code-review-pipeline',
  '코드 리뷰 → 정중한 피드백 이메일',
  '코드를 review-bot으로 리뷰한 결과를 email-polite로 정중한 피드백 이메일로 변환',
  (SELECT id FROM users WHERE email='1@openagentx.org'),
  '{"nodes":[
    {"id":"input","type":"input","position":{"x":100,"y":100},"data":{"label":"코드"}},
    {"id":"review","type":"prompt","position":{"x":350,"y":100},"data":{"slug":"review-bot","label":"코드 리뷰"}},
    {"id":"email","type":"prompt","position":{"x":600,"y":100},"data":{"slug":"email-polite","label":"정중한 이메일"}},
    {"id":"output","type":"output","position":{"x":850,"y":100},"data":{"label":"최종 결과"}}
  ],"edges":[
    {"from":"input","to":"review"},
    {"from":"review","to":"email"},
    {"from":"email","to":"output"}
  ]}'::jsonb,
  TRUE, TRUE, 'development'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed: SEO translate
INSERT INTO workflows (slug, name, description, owner_id, definition, is_public, is_featured, category)
VALUES (
  'seo-translate',
  'SEO 분석 → 한국어 번역',
  '영문 페이지 텍스트를 SEO 관점에서 분석한 후 한국어로 번역합니다.',
  (SELECT id FROM users WHERE email='1@openagentx.org'),
  '{"nodes":[
    {"id":"input","type":"input","position":{"x":100,"y":120},"data":{"label":"영문 본문"}},
    {"id":"seo","type":"prompt","position":{"x":350,"y":120},"data":{"slug":"seo-analyzer","label":"SEO 분석"}},
    {"id":"translate","type":"prompt","position":{"x":600,"y":120},"data":{"slug":"translator-ko","label":"한국어 번역"}},
    {"id":"output","type":"output","position":{"x":850,"y":120},"data":{"label":"한국어 결과"}}
  ],"edges":[
    {"from":"input","to":"seo"},
    {"from":"seo","to":"translate"},
    {"from":"translate","to":"output"}
  ]}'::jsonb,
  TRUE, TRUE, 'marketing'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed: interview prep
INSERT INTO workflows (slug, name, description, owner_id, definition, is_public, is_featured, category)
VALUES (
  'interview-prep',
  '직무 → 면접 코칭 → 질문 정리',
  '직무명을 입력받아 interview-coach 가 코칭한 후 meeting-summarizer 로 핵심 질문을 정리합니다.',
  (SELECT id FROM users WHERE email='1@openagentx.org'),
  '{"nodes":[
    {"id":"input","type":"input","position":{"x":100,"y":140},"data":{"label":"직무명"}},
    {"id":"coach","type":"prompt","position":{"x":350,"y":140},"data":{"slug":"interview-coach","label":"면접 코칭"}},
    {"id":"summary","type":"prompt","position":{"x":600,"y":140},"data":{"slug":"meeting-summarizer","label":"질문 정리"}},
    {"id":"output","type":"output","position":{"x":850,"y":140},"data":{"label":"최종 정리"}}
  ],"edges":[
    {"from":"input","to":"coach"},
    {"from":"coach","to":"summary"},
    {"from":"summary","to":"output"}
  ]}'::jsonb,
  TRUE, TRUE, 'career'
)
ON CONFLICT (slug) DO NOTHING;
