-- 0043_og_builders.sql — OG 빌더 100명 모집 (Beta — 결정 27)
-- 정본: docs/PRD-OpenAgentX.md §4.14.
--
-- 적용 전 마스터 승인 필수.

CREATE TABLE IF NOT EXISTS og_builder_enrollments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT UNIQUE NOT NULL,
    display_name   TEXT NOT NULL,
    portfolio_url  TEXT,
    expertise      JSONB NOT NULL DEFAULT '[]'::jsonb,
    bio            TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    invited_user_id UUID REFERENCES users(id),  -- approve 시 발급된 portal 계정
    reviewer_id    UUID REFERENCES users(id),
    review_note    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_og_enroll_status
    ON og_builder_enrollments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_og_enroll_email
    ON og_builder_enrollments(email);

-- bounty 매칭 후보 테이블 (참조용 — 결정 21)
CREATE TABLE IF NOT EXISTS bounty_candidates (
    bounty_id   UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    rank        INTEGER NOT NULL,
    score       NUMERIC(5, 3) NOT NULL,
    reasons     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (bounty_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_bounty_candidates_rank
    ON bounty_candidates(bounty_id, rank);
