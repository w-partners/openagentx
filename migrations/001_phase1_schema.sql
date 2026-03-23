-- Phase 1 Schema: ACP Seller Agent
-- Up Migration

-- ACP Job 기록
CREATE TABLE IF NOT EXISTS acp_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acp_job_id      VARCHAR(100) UNIQUE NOT NULL,
    service_type    VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    buyer_address   VARCHAR(42),
    input_data      JSONB NOT NULL,
    result_data     JSONB,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    earned_usdc     DECIMAL(10, 4),
    processing_ms   INTEGER,
    error_message   TEXT,
    evaluation_score DECIMAL(3, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acp_jobs_status ON acp_jobs(status);
CREATE INDEX IF NOT EXISTS idx_acp_jobs_service_type ON acp_jobs(service_type);
CREATE INDEX IF NOT EXISTS idx_acp_jobs_created_at ON acp_jobs(created_at DESC);

-- 지갑 트랜잭션 로그
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash         VARCHAR(66) UNIQUE,
    tx_type         VARCHAR(20) NOT NULL,
    amount_usdc     DECIMAL(10, 4),
    amount_eth      DECIMAL(18, 8),
    from_address    VARCHAR(42),
    to_address      VARCHAR(42),
    related_job_id  UUID REFERENCES acp_jobs(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    block_number    BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON wallet_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);

-- 분석 캐시
CREATE TABLE IF NOT EXISTS analysis_cache (
    cache_key       VARCHAR(200) PRIMARY KEY,
    data            JSONB NOT NULL,
    source          VARCHAR(50) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON analysis_cache(expires_at);

-- 에이전트 운영 로그
CREATE TABLE IF NOT EXISTS agent_logs (
    id              BIGSERIAL PRIMARY KEY,
    level           VARCHAR(10) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    message         TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(level);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);

-- 일간 통계
CREATE TABLE IF NOT EXISTS daily_stats (
    date            DATE PRIMARY KEY,
    total_jobs      INTEGER NOT NULL DEFAULT 0,
    completed_jobs  INTEGER NOT NULL DEFAULT 0,
    failed_jobs     INTEGER NOT NULL DEFAULT 0,
    total_earned    DECIMAL(10, 4) NOT NULL DEFAULT 0,
    avg_processing  INTEGER,
    avg_evaluation  DECIMAL(3, 2),
    quick_scan_count    INTEGER NOT NULL DEFAULT 0,
    tx_preflight_count  INTEGER NOT NULL DEFAULT 0,
    deep_dive_count     INTEGER NOT NULL DEFAULT 0
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_acp_jobs_updated
    BEFORE UPDATE ON acp_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
