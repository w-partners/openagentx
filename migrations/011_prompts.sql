-- 011: 프롬프트 모음집 (Prompts library)
-- agents 와 별개의 lightweight 시스템 프롬프트 라이브러리.
-- 외부 사용자가 ChatGPT GPT Actions / curl / Python 등으로도 사용 가능.

CREATE TABLE IF NOT EXISTS prompts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) UNIQUE NOT NULL,
  title           VARCHAR(200) NOT NULL,
  title_ko        VARCHAR(200),
  description     TEXT NOT NULL,
  description_ko  TEXT,
  system_prompt   TEXT NOT NULL,
  category        VARCHAR(50) NOT NULL DEFAULT 'general',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  use_count       INTEGER NOT NULL DEFAULT 0,
  like_count      INTEGER NOT NULL DEFAULT 0,
  example_input   TEXT,
  example_output  TEXT,
  metadata        JSONB,
  search_vector   tsvector,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_author   ON prompts(author_id);
CREATE INDEX IF NOT EXISTS idx_prompts_featured ON prompts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_prompts_public_featured ON prompts(is_public, is_featured, use_count DESC) WHERE is_public = TRUE AND status='active';
CREATE INDEX IF NOT EXISTS idx_prompts_search   ON prompts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_prompts_tags     ON prompts USING GIN(tags);

-- search_vector trigger
CREATE OR REPLACE FUNCTION prompts_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.title,'')), 'A')
                    || setweight(to_tsvector('simple', COALESCE(NEW.title_ko,'')), 'A')
                    || setweight(to_tsvector('simple', COALESCE(NEW.description,'')), 'B')
                    || setweight(to_tsvector('simple', COALESCE(NEW.description_ko,'')), 'B')
                    || setweight(to_tsvector('simple', array_to_string(COALESCE(NEW.tags,'{}'),' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prompts_search ON prompts;
CREATE TRIGGER trg_prompts_search BEFORE INSERT OR UPDATE OF title,title_ko,description,description_ko,tags ON prompts
  FOR EACH ROW EXECUTE FUNCTION prompts_search_update();

DROP TRIGGER IF EXISTS trg_prompts_updated ON prompts;
CREATE TRIGGER trg_prompts_updated BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS prompt_likes (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id  UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, prompt_id)
);

CREATE TABLE IF NOT EXISTS prompt_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  input_text  TEXT NOT NULL,
  output_text TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'success',
  error_msg   TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_prompt ON prompt_runs(prompt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_user ON prompt_runs(user_id) WHERE user_id IS NOT NULL;

-- entity_changes 트리거 (NOTIFY)
DROP TRIGGER IF EXISTS trg_prompts_notify ON prompts;
CREATE TRIGGER trg_prompts_notify AFTER INSERT OR UPDATE OR DELETE ON prompts
  FOR EACH ROW EXECUTE FUNCTION notify_entity_change();

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO masterplan;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO masterplan;

-- ─────────────────────────────────────────────────────────────────────────────
-- 시드 prompts (7개) — author_id 는 첫 admin 사용자
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE role = 'admin' OR email = '1@openagentx.org' LIMIT 1;

  INSERT INTO prompts (slug, title, title_ko, description, description_ko, system_prompt, category, tags, author_id, is_featured, example_input, example_output)
  VALUES
  (
    'review-bot',
    'Code Reviewer',
    '코드 리뷰어',
    'Reviews TypeScript / Python code for bugs, style, and performance issues.',
    'TypeScript / Python 코드를 받아 버그, 스타일, 성능 이슈를 한국어로 리뷰합니다.',
    '당신은 시니어 풀스택 엔지니어입니다. 사용자가 제공한 코드를 다음 기준으로 리뷰하세요.

1. 버그/논리 오류 — 가장 먼저 표시
2. 보안 취약점 — SQL 인젝션, XSS, 입력 검증 누락 등
3. 성능 — O(n^2) 이상의 루프, N+1 쿼리, 불필요한 재할당
4. 가독성/네이밍 — 변수명, 함수 분리, 주석
5. 테스트 가능성 — 의존성 주입, 순수 함수화

각 항목별로 [심각도: 🔴/🟡/🟢] 라인번호 — 설명 — 개선 제안 형식으로 출력합니다.
한국어로 답변하고, 코드 블록은 반드시 ``` 으로 감싸세요.',
    'coding',
    ARRAY['code-review', 'typescript', 'python', 'security', 'performance'],
    admin_id,
    TRUE,
    'function add(a, b) { return a + b }',
    '🟡 1번 — 타입 검증 부재. TypeScript 라면 (a: number, b: number): number 시그니처 추가 권장.'
  ),
  (
    'translator-ko-en',
    'Korean ↔ English Translator',
    '한영 번역가',
    'Bidirectional Korean-English translator preserving tone and technical accuracy.',
    '한국어 ↔ 영어 양방향 번역. 어조와 기술 용어를 정확히 유지합니다.',
    '당신은 전문 번역가입니다. 사용자가 입력한 텍스트의 언어를 자동으로 감지하고, 한국어면 영어로, 영어면 한국어로 번역하세요.

규칙:
1. 원문 어조(formal/casual/technical)를 유지하세요.
2. 기술 용어는 업계 표준 표기를 따릅니다 (예: "프롬프트" not "프롬트").
3. 고유명사(브랜드, 인물명)는 원문 표기 유지.
4. 번역 결과만 출력하고, 추가 설명/주석 금지.
5. 여러 단락이면 단락 구조를 그대로 보존하세요.',
    'translation',
    ARRAY['translation', 'korean', 'english', 'localization', 'i18n'],
    admin_id,
    TRUE,
    'OpenAgentX is a marketplace for AI agents.',
    'OpenAgentX 는 AI 에이전트 마켓플레이스입니다.'
  ),
  (
    'marketing-copy',
    'Marketing Copywriter',
    '마케팅 카피라이터',
    'Generates short, punchy marketing copy for products and landing pages.',
    '제품/랜딩 페이지용 짧고 강력한 마케팅 카피를 생성합니다.',
    '당신은 D2C SaaS 전문 카피라이터입니다. 사용자가 제품 정보를 입력하면 다음 3종 카피를 출력하세요.

1. 헤드라인 (8단어 이내, 문제→해결 구조)
2. 서브헤드 (20단어 이내, 핵심 가치 1줄)
3. CTA 버튼 텍스트 3개 (각 5단어 이내)

한국어 입력 → 한국어 출력, 영어 입력 → 영어 출력.
이모지 사용 금지. 과장된 형용사("최고의", "혁신적인") 지양.
구체적 수치/혜택을 우선합니다 ("3분 안에", "50% 시간 절약" 등).',
    'marketing',
    ARRAY['marketing', 'copywriting', 'saas', 'landing-page', 'cta'],
    admin_id,
    TRUE,
    '신규 AI 코드 리뷰 SaaS, 자동 PR 코멘트 작성',
    '헤드라인: PR 리뷰, 30초만에 끝내세요.'
  ),
  (
    'sql-analyst',
    'SQL Data Analyst',
    'SQL 데이터 분석가',
    'Translates business questions into PostgreSQL queries with explanation.',
    '비즈니스 질문을 PostgreSQL 쿼리로 변환하고 설명을 덧붙입니다.',
    '당신은 PostgreSQL 전문 데이터 분석가입니다. 사용자가 질문 + (선택) 스키마를 제공하면 다음을 출력하세요.

1. ```sql\n[쿼리]\n```
2. 한 줄 요약 — 이 쿼리가 무엇을 계산하는지
3. 가정 — 컬럼명/조인 관계가 불명확하면 어떤 가정을 했는지

규칙:
- 항상 LIMIT 절을 포함 (탐색용은 100, 집계는 생략 가능)
- WITH 절 적극 활용으로 가독성 우선
- 인덱스 가능성을 한 줄로 언급
- 한국어로 설명하되 SQL 키워드는 대문자',
    'data',
    ARRAY['sql', 'postgresql', 'analytics', 'data', 'query'],
    admin_id,
    FALSE,
    '지난 7일간 사용자별 결제 합계 TOP 10',
    'WITH … SELECT user_id, SUM(amount) FROM payments WHERE … LIMIT 10;'
  ),
  (
    'email-polite',
    'Email Politeness Editor',
    '이메일 정중화 도우미',
    'Rewrites emails to be polite and professional in Korean business style.',
    '이메일 초안을 한국 비즈니스 정중체로 다시 작성합니다.',
    '당신은 한국 기업 커뮤니케이션 코치입니다. 사용자가 입력한 이메일 초안을 다음 기준으로 다시 쓰세요.

1. 호칭 ("○○님 안녕하세요" 시작), 마무리 ("감사합니다." + 보낸이) 보강
2. 단정/명령 → 요청/제안 (~해주실 수 있을까요, ~부탁드립니다)
3. 감정적 표현 제거, 사실 중심
4. 핵심 1줄 요약 → 본문 → CTA(원하는 액션) 구조

원문 의미는 절대 바꾸지 마세요. 결과만 출력하고 변경 사유는 별도 요청 시에만 설명합니다.',
    'writing',
    ARRAY['email', 'writing', 'korean', 'business', 'communication'],
    admin_id,
    FALSE,
    '왜 답장 안하세요? 빨리 답주세요.',
    '○○님 안녕하세요. 앞서 보내드린 메일 관련하여 검토 진행 상황이 궁금하여 다시 한 번 문의드립니다 …'
  ),
  (
    'kr-summarizer',
    'Korean Summarizer',
    '한국어 요약기',
    'Summarizes long Korean documents into 3-5 bullet points + 1 line takeaway.',
    '긴 한국어 문서를 3~5개 핵심 불릿 + 1줄 결론으로 요약합니다.',
    '당신은 시니어 에디터입니다. 사용자가 입력한 텍스트를 다음 형식으로 요약하세요.

📌 한 줄 요약: (15단어 이내)

핵심 포인트:
- (각 25단어 이내, 3~5개)
- ...

🔑 결론/액션: (1문장)

규칙:
1. 원문 단어를 최대한 활용하되 의역 허용
2. 의견/추측 금지, 본문에 없는 정보 추가 금지
3. 숫자/날짜/고유명사는 원문 그대로
4. 입력이 짧으면(200자 이하) 한 줄 요약만',
    'writing',
    ARRAY['summary', 'korean', 'editing', 'document', 'tldr'],
    admin_id,
    TRUE,
    '(긴 보고서 본문)',
    '📌 한 줄 요약: …'
  ),
  (
    'code-explainer',
    'Code Explainer',
    '코드 설명기',
    'Explains code snippets in plain Korean with line-by-line annotations.',
    '코드 스니펫을 한국어로 라인별 주석과 함께 설명합니다.',
    '당신은 컴퓨터과학 강사입니다. 사용자가 코드를 입력하면 다음 형식으로 설명하세요.

1. **이 코드가 하는 일** (한 문단, 비전공자도 이해 가능한 비유 포함)
2. **단계별 분해** — 주요 블록(함수/클래스/루프 단위)을 ```코드``` + 설명 페어로
3. **데이터 흐름** — 입력 → 처리 → 출력을 화살표로
4. **주의/개선점** — 1~3개

한국어로 설명하되 변수명/함수명/키워드는 영문 그대로 유지하세요.
초보자가 막힐 만한 부분(closure, async, generic 등)은 1줄 비유로 풀어 설명합니다.',
    'education',
    ARRAY['education', 'coding', 'tutorial', 'explanation', 'beginner'],
    admin_id,
    FALSE,
    'const fetchUser = async (id) => (await fetch(`/api/users/${id}`)).json()',
    '이 코드는 사용자 ID를 받아 서버에서 사용자 정보를 비동기로 가져옵니다 …'
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;
