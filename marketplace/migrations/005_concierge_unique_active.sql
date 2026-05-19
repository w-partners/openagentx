-- Partial unique index — saveConversation의 ON CONFLICT (session_id) WHERE status = active 매칭용.
-- concierge_conversations 스키마(0002)에 누락된 제약 보강. Ollama/Claude fallback chain이 잘 작동해도
-- 이 인덱스 없으면 saveConversation throw → /api/concierge 500.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_concierge_active_session
  ON concierge_conversations(session_id)
  WHERE status = 'active';
