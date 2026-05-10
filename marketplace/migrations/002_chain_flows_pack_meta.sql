-- chain_flows에 Pack(워크플로우 묶음) 큐레이션 메타데이터 추가
-- - tags: 검색·필터링용 태그 배열
-- - is_featured: 큐레이션된 추천 팩 마킹

ALTER TABLE chain_flows
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_chain_flows_featured
  ON chain_flows (is_featured)
  WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_chain_flows_tags
  ON chain_flows USING GIN (tags);
