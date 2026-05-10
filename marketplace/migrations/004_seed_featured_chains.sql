-- 추천 Pack 시드 — chain_flows에 카테고리별 큐레이션된 워크플로우 추가
-- 002 마이그레이션 적용 후 실행 (tags, is_featured 컬럼 필요)
-- 멱등성: ON CONFLICT DO NOTHING (slug/name 충돌 시)

INSERT INTO chain_flows (creator_id, name, description, category, steps, is_public, is_featured, tags)
VALUES
  (
    NULL,
    '코드 리뷰 → 보안 → 리팩토링 팩',
    '코드 변경분을 받아 자동으로 리뷰·보안 점검·리팩토링 제안까지 수행하는 3단계 워크플로우.',
    'coding',
    '[
      {"name":"코드 리뷰","type":"fulfill","category":"coding","description":"전체 변경분 리뷰","auto_trigger":true,"config":{"search_query":"code review"}},
      {"name":"보안 스캔","type":"fulfill","category":"coding","description":"OWASP 기반 취약점 점검","auto_trigger":true,"config":{"search_query":"security audit"}},
      {"name":"리팩토링 제안","type":"fulfill","category":"coding","description":"구조·성능 개선 제안","auto_trigger":true,"config":{"search_query":"refactoring"}}
    ]'::jsonb,
    TRUE,
    TRUE,
    ARRAY['코딩','코드리뷰','보안','리팩토링']
  ),
  (
    NULL,
    '한국어 번역 → 톤 보정 → 검수 팩',
    '영문/일문/중문 콘텐츠를 자연스러운 한국어로 번역하고 어조까지 보정하는 3단계.',
    'translation',
    '[
      {"name":"기계번역","type":"fulfill","category":"translation","description":"기본 번역 초안","auto_trigger":true,"config":{"search_query":"translation"}},
      {"name":"어조 보정","type":"fulfill","category":"translation","description":"한국어 자연어 어조 보정","auto_trigger":true,"config":{"search_query":"tone polish"}},
      {"name":"전문가 검수","type":"matching","category":"translation","description":"인간 번역가 검수 (선택)","auto_trigger":false,"config":{"max_price":5,"timeout_minutes":120}}
    ]'::jsonb,
    TRUE,
    TRUE,
    ARRAY['번역','한국어','검수']
  ),
  (
    NULL,
    '암호화폐 시장조사 → 온체인 → 리포트 팩',
    '특정 토큰을 받아 시장 동향·온체인 활동·리스크를 종합 리포트로 묶어주는 4단계.',
    'crypto',
    '[
      {"name":"시장 동향","type":"fulfill","category":"crypto","description":"가격·거래량·뉴스 요약","auto_trigger":true,"config":{"search_query":"market overview"}},
      {"name":"온체인 활동","type":"fulfill","category":"crypto","description":"홀더·트랜잭션·고래 동향","auto_trigger":true,"config":{"search_query":"on-chain analysis"}},
      {"name":"리스크 평가","type":"fulfill","category":"finance","description":"러그풀·유동성 리스크","auto_trigger":true,"config":{"search_query":"risk assessment"}},
      {"name":"종합 리포트","type":"fulfill","category":"research","description":"한 페이지 요약 리포트","auto_trigger":true,"config":{"search_query":"executive summary"}}
    ]'::jsonb,
    TRUE,
    TRUE,
    ARRAY['암호화폐','온체인','리포트','리스크']
  ),
  (
    NULL,
    'SNS 콘텐츠 5종 동시 생성 팩',
    '제품 설명을 받아 트위터·인스타·링크드인·블로그·뉴스레터용 카피를 동시에 만드는 5단계.',
    'content_creation',
    '[
      {"name":"트위터 스레드","type":"fulfill","category":"content_creation","description":"5~7개 트윗 시퀀스","auto_trigger":true,"config":{"search_query":"twitter thread"}},
      {"name":"인스타 캡션","type":"fulfill","category":"content_creation","description":"이모지 포함 짧은 캡션","auto_trigger":true,"config":{"search_query":"instagram caption"}},
      {"name":"링크드인 포스트","type":"fulfill","category":"marketing","description":"전문가 톤 1000자","auto_trigger":true,"config":{"search_query":"linkedin post"}},
      {"name":"블로그 초안","type":"fulfill","category":"content_creation","description":"SEO 최적화 1500자","auto_trigger":true,"config":{"search_query":"blog draft"}},
      {"name":"뉴스레터","type":"fulfill","category":"marketing","description":"섹션 분할 이메일","auto_trigger":true,"config":{"search_query":"newsletter"}}
    ]'::jsonb,
    TRUE,
    TRUE,
    ARRAY['SNS','콘텐츠','마케팅','SEO']
  ),
  (
    NULL,
    '브랜드 디자인 키트 팩',
    '브랜드 컨셉을 받아 로고·컬러팔레트·SNS 배너·아이콘 세트를 일관성 있게 만드는 4단계.',
    'design',
    '[
      {"name":"무드보드","type":"fulfill","category":"design","description":"컨셉 키워드·레퍼런스 수집","auto_trigger":true,"config":{"search_query":"moodboard"}},
      {"name":"로고 시안","type":"fulfill","category":"design","description":"3안 로고 생성","auto_trigger":true,"config":{"search_query":"logo design"}},
      {"name":"컬러팔레트","type":"fulfill","category":"design","description":"5색 팔레트 + HEX","auto_trigger":true,"config":{"search_query":"color palette"}},
      {"name":"SNS 배너 세트","type":"fulfill","category":"design","description":"트위터/인스타/유튜브 사이즈","auto_trigger":true,"config":{"search_query":"social banner"}}
    ]'::jsonb,
    TRUE,
    TRUE,
    ARRAY['디자인','브랜딩','로고','SNS']
  )
ON CONFLICT DO NOTHING;
