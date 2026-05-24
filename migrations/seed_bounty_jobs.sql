-- seed_bounty_jobs.sql — NEXT.md #5 bounty/jobs 카탈로그 seed
-- 실행: docker exec openagentx-postgres-1 psql -U cryptointel -d cryptointel -f /path/to/this.sql
-- Idempotent: 같은 title/buyer 조합은 ON CONFLICT 로 skip
--
-- 정본: PRD-OpenAgentX Appendix A 4종 거래 모델 (fixed/auction/matching/chain)

-- ─── 5 bounties (categorize 다양) ───────────────────────────────
WITH first_user AS (SELECT id FROM users LIMIT 1)
INSERT INTO bounties (poster_id, title, description, budget_usdc, category, tags, status, expires_at)
SELECT (SELECT id FROM first_user),
       title, description, budget_usdc, category, tags, 'open', expires_at
FROM (VALUES
  ('React 컴포넌트 라이브러리 — design system 정착',
   '50+ React 컴포넌트를 만들어주세요. Tailwind + Storybook. 디자인 토큰 통일.',
   500.0::numeric(12,4), 'code',
   ARRAY['react', 'tailwind', 'storybook', 'design-system'],
   NOW() + INTERVAL '14 days'),
  ('블로그 글 30편 — AI/Web3 트렌드',
   '한국어 1500자 기준 30편. SEO 최적화 + 인용 출처 포함. 주 5편 페이스.',
   300.0, 'content',
   ARRAY['korean', 'seo', 'ai', 'web3'],
   NOW() + INTERVAL '30 days'),
  ('CryptoIntel — 비트코인 가격 예측 모델',
   '과거 5년 가격 데이터 + on-chain 지표로 단기(7일) 예측 모델. 백테스트 결과 첨부.',
   1200.0, 'data',
   ARRAY['ml', 'crypto', 'btc', 'forecasting'],
   NOW() + INTERVAL '21 days'),
  ('마케팅 자동화 — Telegram + Discord 봇',
   '커뮤니티 가입 환영 + 일일 공지 + 이벤트 참여 자동화 봇 1개.',
   200.0, 'marketing',
   ARRAY['telegram', 'discord', 'community'],
   NOW() + INTERVAL '10 days'),
  ('영어 학습 챗봇 — 한국인 비즈니스 영어',
   '한국인이 자주 쓰는 영어 표현 100개 + 발음 교정 + 시나리오 연습.',
   400.0, 'education',
   ARRAY['english', 'business', 'korean-learner', 'chatbot'],
   NOW() + INTERVAL '60 days')
) AS v(title, description, budget_usdc, category, tags, expires_at)
ON CONFLICT DO NOTHING;

-- ─── bounty_candidates: 각 bounty 에 가장 적합한 agent 2~3 후보 ───
-- category 매칭 — Postgres tuple type 문제로 rank/score/reasons 를 별도 CASE 로 분리.
WITH ranked AS (
  SELECT b.id AS bounty_id, a.id AS agent_id, b.category AS cat, a.name AS aname
  FROM bounties b CROSS JOIN agents a
), mapped AS (
  SELECT bounty_id, agent_id,
    CASE
      WHEN cat='code'      AND aname='CodeMaster'     THEN 1
      WHEN cat='code'      AND aname='AutoFlow'       THEN 2
      WHEN cat='content'   AND aname='ContentCraft'   THEN 1
      WHEN cat='content'   AND aname='TransLingua'    THEN 2
      WHEN cat='data'      AND aname='CryptoAnalyzer' THEN 1
      WHEN cat='data'      AND aname='DataInsight'    THEN 2
      WHEN cat='marketing' AND aname='MarketingPro'   THEN 1
      WHEN cat='marketing' AND aname='AutoFlow'       THEN 2
      WHEN cat='education' AND aname='EduTutor'       THEN 1
      WHEN cat='education' AND aname='TransLingua'    THEN 2
    END AS rk,
    CASE
      WHEN cat='code'      AND aname='CodeMaster'     THEN 0.92
      WHEN cat='code'      AND aname='AutoFlow'       THEN 0.75
      WHEN cat='content'   AND aname='ContentCraft'   THEN 0.95
      WHEN cat='content'   AND aname='TransLingua'    THEN 0.70
      WHEN cat='data'      AND aname='CryptoAnalyzer' THEN 0.94
      WHEN cat='data'      AND aname='DataInsight'    THEN 0.88
      WHEN cat='marketing' AND aname='MarketingPro'   THEN 0.91
      WHEN cat='marketing' AND aname='AutoFlow'       THEN 0.78
      WHEN cat='education' AND aname='EduTutor'       THEN 0.96
      WHEN cat='education' AND aname='TransLingua'    THEN 0.82
    END AS sc,
    CASE
      WHEN cat='code'      AND aname='CodeMaster'     THEN '["전문 분야 일치","평점 4.8"]'::jsonb
      WHEN cat='content'   AND aname='ContentCraft'   THEN '["한국어 SEO 전문"]'::jsonb
      WHEN cat='data'      AND aname='CryptoAnalyzer' THEN '["crypto 도메인 특화"]'::jsonb
      WHEN cat='marketing' AND aname='MarketingPro'   THEN '["community automation 7건"]'::jsonb
      WHEN cat='education' AND aname='EduTutor'       THEN '["한국인 영어 학습 특화"]'::jsonb
      ELSE '["일반 매칭"]'::jsonb
    END AS rs
  FROM ranked
)
INSERT INTO bounty_candidates (bounty_id, agent_id, rank, score, reasons)
SELECT bounty_id, agent_id, rk, sc::numeric(5,3), rs FROM mapped WHERE rk IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── 3 marketplace_jobs — direct 거래 (commerce 사례) ───────────
WITH first_buyer AS (SELECT id FROM users LIMIT 1)
INSERT INTO marketplace_jobs (service_id, agent_id, buyer_id, status, input_data,
                              payment_amount, commission_rate, commission_amount, provider_amount, source)
SELECT s.id, s.agent_id, (SELECT id FROM first_buyer),
       'completed',
       jsonb_build_object('prompt', '샘플 요청', 'note', 'seed sample'),
       50.0::numeric(12,4), 10.0::numeric(5,2),
       5.0::numeric(12,4), 45.0::numeric(12,4), 'direct'
FROM agent_services s
LIMIT 3
ON CONFLICT DO NOTHING;

-- ─── 결과 ──────────────────────────────────────────────────────
SELECT 'bounties' AS table_name, count(*) FROM bounties
UNION ALL SELECT 'bounty_candidates', count(*) FROM bounty_candidates
UNION ALL SELECT 'marketplace_jobs', count(*) FROM marketplace_jobs;
