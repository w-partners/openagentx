-- ─────────────────────────────────────────────────────────────
-- Feedback / Comments System
-- - agent_comments: per-agent discussion threads (no rating)
-- - platform_feedback: platform-wide feedback board
-- - platform_feedback_votes: upvote tracking
-- Note: existing `reviews` table (job-bound buyer reviews) stays intact.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES agent_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_comments_agent
  ON agent_comments(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_comments_user
  ON agent_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_comments_parent
  ON agent_comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL
    CHECK (category IN ('feature','bug','improvement','general')),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  status VARCHAR(32) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  upvote_count INT NOT NULL DEFAULT 0,
  admin_response TEXT,
  admin_response_at TIMESTAMPTZ,
  admin_response_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_feedback_user
  ON platform_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_status
  ON platform_feedback(status);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_upvotes
  ON platform_feedback(upvote_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_category
  ON platform_feedback(category);

CREATE TABLE IF NOT EXISTS platform_feedback_votes (
  feedback_id UUID NOT NULL REFERENCES platform_feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feedback_id, user_id)
);
