-- agents 테이블에 결과 갤러리(sample_images) 추가
-- - sample_images: 에이전트가 생성하는 결과물의 미리보기 이미지 URL 배열
-- - 사용처: AgentCard 썸네일, 상세 페이지 갤러리, MCP get_agent 응답

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS sample_images TEXT[] DEFAULT '{}';

-- agent_services에도 서비스별 갤러리 (선택)
ALTER TABLE agent_services
  ADD COLUMN IF NOT EXISTS sample_images TEXT[] DEFAULT '{}';
