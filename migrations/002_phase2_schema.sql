-- Phase 2 Schema: AI Agent Marketplace
-- Up Migration
-- Depends on: 001_phase1_schema.sql

-- ============================================================
-- pgvector 확장
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 사용자
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255),
    nickname        VARCHAR(50) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'buyer',
    wallet_address  VARCHAR(42),
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    balance_usdc    DECIMAL(10, 4) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address) WHERE wallet_address IS NOT NULL;

-- ============================================================
-- 에이전트
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT NOT NULL,
    description_ko  TEXT,
    category        VARCHAR(50) NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    logo_url        TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    acp_agent_id    VARCHAR(100),
    avg_rating      DECIMAL(2, 1) NOT NULL DEFAULT 0,
    total_reviews   INTEGER NOT NULL DEFAULT 0,
    total_jobs      INTEGER NOT NULL DEFAULT 0,
    total_revenue   DECIMAL(12, 4) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ranking_score   DECIMAL(8, 4) NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    metadata        JSONB,
    -- 벡터 검색용 임베딩 (pgvector)
    description_embedding vector(1536),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_ranking ON agents(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_agents_featured ON agents(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);

-- 벡터 검색 인덱스 (pgvector ivfflat)
CREATE INDEX IF NOT EXISTS idx_agents_embedding ON agents
    USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);

-- Full-Text Search: tsvector 컬럼 + GIN 인덱스
ALTER TABLE agents ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_agents_search ON agents USING GIN(search_vector);

-- search_vector 자동 갱신 트리거
CREATE OR REPLACE FUNCTION agents_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description_ko, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agents_search_vector
    BEFORE INSERT OR UPDATE OF name, description, description_ko, category ON agents
    FOR EACH ROW EXECUTE FUNCTION agents_search_vector_update();

-- ============================================================
-- 에이전트 서비스
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    name_ko         VARCHAR(100),
    description     TEXT NOT NULL,
    description_ko  TEXT,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    input_schema    JSONB NOT NULL,
    output_schema   JSONB,
    avg_duration_ms INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_services_agent ON agent_services(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_services_active ON agent_services(agent_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- 마켓플레이스 Job
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id      UUID NOT NULL REFERENCES agent_services(id),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    input_data      JSONB NOT NULL,
    result_data     JSONB,
    payment_amount  DECIMAL(12, 4) NOT NULL,
    escrow_balance  DECIMAL(12, 4) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(12, 4) NOT NULL DEFAULT 0,
    provider_amount DECIMAL(12, 4) NOT NULL DEFAULT 0,
    source          VARCHAR(20) NOT NULL DEFAULT 'direct',
    processing_ms   INTEGER,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mjobs_agent ON marketplace_jobs(agent_id);
CREATE INDEX IF NOT EXISTS idx_mjobs_buyer ON marketplace_jobs(buyer_id);
CREATE INDEX IF NOT EXISTS idx_mjobs_service ON marketplace_jobs(service_id);
CREATE INDEX IF NOT EXISTS idx_mjobs_status ON marketplace_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mjobs_created ON marketplace_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mjobs_source ON marketplace_jobs(source);

-- ============================================================
-- 리뷰
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES marketplace_jobs(id),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_agent ON reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job ON reviews(job_id);

-- ============================================================
-- 결제
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID REFERENCES marketplace_jobs(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    payment_type    VARCHAR(20) NOT NULL,
    amount          DECIMAL(12, 4) NOT NULL,
    currency        VARCHAR(10) NOT NULL DEFAULT 'USDC',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    tx_hash         VARCHAR(66),
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);

-- ============================================================
-- 즐겨찾기 (composite PK)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_agent ON favorites(agent_id);

-- ============================================================
-- 바운티
-- ============================================================
CREATE TABLE IF NOT EXISTS bounties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poster_id       UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    budget_usdc     DECIMAL(12, 4) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    matched_agent_id UUID REFERENCES agents(id),
    matched_job_id  UUID REFERENCES marketplace_jobs(id),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bounties_poster ON bounties(poster_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_category ON bounties(category);
CREATE INDEX IF NOT EXISTS idx_bounties_expires ON bounties(expires_at) WHERE status = 'open';

-- ============================================================
-- 바운티 후보
-- ============================================================
CREATE TABLE IF NOT EXISTS bounty_candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bounty_id       UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agents(id),
    match_score     DECIMAL(5, 2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bcandidates_bounty ON bounty_candidates(bounty_id);
CREATE INDEX IF NOT EXISTS idx_bcandidates_agent ON bounty_candidates(agent_id);
CREATE INDEX IF NOT EXISTS idx_bcandidates_score ON bounty_candidates(match_score DESC);

-- ============================================================
-- 구독
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    tier_name       VARCHAR(100) NOT NULL,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_agent ON subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at) WHERE status = 'active';

-- ============================================================
-- 구독 티어
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    service_id      UUID REFERENCES agent_services(id),
    name            VARCHAR(100) NOT NULL,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    duration_days   INTEGER NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_tiers_agent ON subscription_tiers(agent_id);
CREATE INDEX IF NOT EXISTS idx_sub_tiers_active ON subscription_tiers(agent_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- 컨시어지 대화
-- ============================================================
CREATE TABLE IF NOT EXISTS concierge_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    session_id      VARCHAR(100) NOT NULL,
    channel         VARCHAR(20) NOT NULL DEFAULT 'web',
    conversation_type VARCHAR(20) NOT NULL DEFAULT 'guide',
    messages        JSONB NOT NULL DEFAULT '[]',
    context         JSONB,
    result_agent_id UUID REFERENCES agents(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concierge_user ON concierge_conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_concierge_session ON concierge_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_concierge_status ON concierge_conversations(status);

-- ============================================================
-- 분쟁
-- ============================================================
CREATE TABLE IF NOT EXISTS disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES marketplace_jobs(id),
    reporter_id     UUID NOT NULL REFERENCES users(id),
    reason          TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    resolution      TEXT,
    resolved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_job ON disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter ON disputes(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- ============================================================
-- 에이전트 프로토콜/결제 설정
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_protocol_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    -- 거래 프로토콜
    enable_direct   BOOLEAN NOT NULL DEFAULT TRUE,
    enable_acp      BOOLEAN NOT NULL DEFAULT FALSE,
    enable_ucp      BOOLEAN NOT NULL DEFAULT FALSE,
    enable_x402     BOOLEAN NOT NULL DEFAULT FALSE,
    -- 결제 수단
    accept_usdc     BOOLEAN NOT NULL DEFAULT TRUE,
    accept_card     BOOLEAN NOT NULL DEFAULT FALSE,
    accept_google_pay BOOLEAN NOT NULL DEFAULT FALSE,
    -- 자율 위임 (AP2)
    allow_autonomous BOOLEAN NOT NULL DEFAULT FALSE,
    autonomous_max_amount DECIMAL(12, 4),
    -- ACP 연동
    acp_wallet_address VARCHAR(42),
    acp_agent_id    VARCHAR(100),
    -- UCP 설정
    ucp_capabilities JSONB,
    -- x402 설정
    x402_price_per_call DECIMAL(10, 6),
    x402_supported_tokens TEXT[] DEFAULT '{USDC}',
    --
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_protocol ON agent_protocol_settings(agent_id);

-- ============================================================
-- updated_at 트리거 (Phase 1에서 함수 이미 생성됨)
-- ============================================================

-- users
CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- agents
CREATE TRIGGER trg_agents_updated
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- marketplace_jobs
CREATE TRIGGER trg_marketplace_jobs_updated
    BEFORE UPDATE ON marketplace_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- payments
CREATE TRIGGER trg_payments_updated
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- bounties
CREATE TRIGGER trg_bounties_updated
    BEFORE UPDATE ON bounties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- concierge_conversations
CREATE TRIGGER trg_concierge_updated
    BEFORE UPDATE ON concierge_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- agent_protocol_settings
CREATE TRIGGER trg_agent_protocol_updated
    BEFORE UPDATE ON agent_protocol_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
