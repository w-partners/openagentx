-- ============================================================
-- Migration 003: Missing Features Schema
-- ============================================================
-- Adds tables/columns referenced by deployed code that were
-- never created in 001/002. Idempotent (IF NOT EXISTS).
--
-- Tables: matching_requests, provider_availability,
--         auction_requests, auction_bids,
--         chain_flows, chain_instances,
--         response_feedback, prompt_versions,
--         reward_config, reward_history
-- Columns: users.is_active
-- ============================================================

-- ------------------------------------------------------------
-- users.is_active + users.name
-- (Code references u.name but the table only has nickname.
--  Add a generated mirror column to keep code working without redeploy.)
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name VARCHAR(50)
    GENERATED ALWAYS AS (nickname) STORED;

-- ------------------------------------------------------------
-- matching_requests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matching_requests (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    requester_contact    JSONB,
    title                TEXT NOT NULL,
    description          TEXT NOT NULL,
    category             VARCHAR(50) NOT NULL,
    location             JSONB,
    urgency              VARCHAR(20) NOT NULL DEFAULT 'normal',
    connection_fee       NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
    status               VARCHAR(20) NOT NULL DEFAULT 'waiting',
    matched_provider_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    matched_agent_id     UUID REFERENCES agents(id) ON DELETE SET NULL,
    matched_at           TIMESTAMPTZ,
    expires_at           TIMESTAMPTZ NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_requests_status   ON matching_requests(status);
CREATE INDEX IF NOT EXISTS idx_matching_requests_category ON matching_requests(category);
CREATE INDEX IF NOT EXISTS idx_matching_requests_requester ON matching_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_matching_requests_provider ON matching_requests(matched_provider_id);
CREATE INDEX IF NOT EXISTS idx_matching_requests_expires  ON matching_requests(expires_at) WHERE status = 'waiting';

-- ------------------------------------------------------------
-- provider_availability
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_availability (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    categories    TEXT[] NOT NULL DEFAULT '{}',
    is_online     BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_avail_online   ON provider_availability(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_provider_avail_user     ON provider_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_avail_categories ON provider_availability USING GIN(categories);

-- ------------------------------------------------------------
-- auction_requests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    requester_ip  VARCHAR(64),
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    category      VARCHAR(50) NOT NULL,
    budget_max    NUMERIC(10, 4),
    status        VARCHAR(20) NOT NULL DEFAULT 'open',
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_status    ON auction_requests(status);
CREATE INDEX IF NOT EXISTS idx_auction_category  ON auction_requests(category);
CREATE INDEX IF NOT EXISTS idx_auction_requester ON auction_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_auction_expires   ON auction_requests(expires_at) WHERE status = 'open';

-- ------------------------------------------------------------
-- auction_bids
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_bids (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id        UUID NOT NULL REFERENCES auction_requests(id) ON DELETE CASCADE,
    provider_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    bid_fee           NUMERIC(10, 4) NOT NULL DEFAULT 0,
    offer_price       NUMERIC(10, 4) NOT NULL,
    offer_description TEXT NOT NULL,
    estimated_time    VARCHAR(100),
    rank              INTEGER,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    selected_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (auction_id, provider_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction  ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_provider ON auction_bids(provider_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_status   ON auction_bids(status);

-- ------------------------------------------------------------
-- chain_flows
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chain_flows (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    name         VARCHAR(200) NOT NULL,
    description  TEXT,
    category     VARCHAR(50) NOT NULL,
    steps        JSONB NOT NULL DEFAULT '[]',
    is_public    BOOLEAN NOT NULL DEFAULT TRUE,
    total_uses   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chain_flows_category ON chain_flows(category);
CREATE INDEX IF NOT EXISTS idx_chain_flows_public   ON chain_flows(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_chain_flows_uses     ON chain_flows(total_uses DESC);
CREATE INDEX IF NOT EXISTS idx_chain_flows_creator  ON chain_flows(creator_id);

-- ------------------------------------------------------------
-- chain_instances
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chain_instances (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id       UUID NOT NULL REFERENCES chain_flows(id) ON DELETE CASCADE,
    requester_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    input_data    JSONB NOT NULL DEFAULT '{}',
    current_step  INTEGER NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'running',
    step_results  JSONB NOT NULL DEFAULT '[]',
    total_cost    NUMERIC(12, 4) NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chain_inst_flow      ON chain_instances(flow_id);
CREATE INDEX IF NOT EXISTS idx_chain_inst_requester ON chain_instances(requester_id);
CREATE INDEX IF NOT EXISTS idx_chain_inst_status    ON chain_instances(status);
CREATE INDEX IF NOT EXISTS idx_chain_inst_started   ON chain_instances(started_at DESC);

-- ------------------------------------------------------------
-- response_feedback
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS response_feedback (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id            UUID REFERENCES marketplace_jobs(id) ON DELETE SET NULL,
    fulfill_query     TEXT,
    agent_id          UUID REFERENCES agents(id) ON DELETE SET NULL,
    service_name      VARCHAR(200),
    rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    is_reuse          BOOLEAN NOT NULL DEFAULT FALSE,
    response_provider VARCHAR(100),
    response_category VARCHAR(100),
    feedback_source   VARCHAR(50) NOT NULL DEFAULT 'web',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_feedback_agent    ON response_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_response_feedback_job      ON response_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_response_feedback_rating   ON response_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_response_feedback_category ON response_feedback(response_category);
CREATE INDEX IF NOT EXISTS idx_response_feedback_created  ON response_feedback(created_at DESC);

-- ------------------------------------------------------------
-- prompt_versions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_versions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id      UUID REFERENCES agents(id) ON DELETE CASCADE,
    service_name  VARCHAR(200),
    category      VARCHAR(100),
    system_prompt TEXT NOT NULL,
    version       INTEGER NOT NULL DEFAULT 1,
    avg_rating    NUMERIC(3, 2) NOT NULL DEFAULT 0,
    total_uses    INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_agent    ON prompt_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_category ON prompt_versions(category);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active   ON prompt_versions(is_active) WHERE is_active = TRUE;

-- ------------------------------------------------------------
-- reward_config
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reward_config (
    id           VARCHAR(100) PRIMARY KEY,
    value        NUMERIC(12, 6) NOT NULL,
    description  TEXT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default config rows used by code (matching.ts, rewards.ts)
INSERT INTO reward_config (id, value, description) VALUES
    ('matching_expiry_minutes',  10,    'Default matching request expiry window (minutes)'),
    ('default_connection_fee',   1.0,   'Default connection fee (USDC) when matching request omits explicit fee'),
    ('referral_level1_rate',     0.05,  'Tier-1 referral commission rate'),
    ('referral_level2_rate',     0.02,  'Tier-2 referral commission rate'),
    ('referral_level3_rate',     0.01,  'Tier-3 referral commission rate'),
    ('purchase_cashback_rate',   0.01,  'Buyer cashback rate per purchase'),
    ('review_reward',            0.10,  'Reward (USDC) for posting a verified review'),
    ('signup_bonus',             1.0,   'Free credit for new signups'),
    ('api_key_bonus',            1.0,   'Free credit for first API key issuance')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- reward_history
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reward_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    amount          NUMERIC(12, 4) NOT NULL,
    source_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    source_job_id   UUID REFERENCES marketplace_jobs(id) ON DELETE SET NULL,
    referral_level  INTEGER,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_history_user    ON reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_type    ON reward_history(type);
CREATE INDEX IF NOT EXISTS idx_reward_history_source_job ON reward_history(source_job_id) WHERE source_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reward_history_created ON reward_history(created_at DESC);

-- ------------------------------------------------------------
-- updated_at triggers (function update_updated_at already exists)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_auction_requests_updated ON auction_requests;
CREATE TRIGGER trg_auction_requests_updated
    BEFORE UPDATE ON auction_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_reward_config_updated ON reward_config;
CREATE TRIGGER trg_reward_config_updated
    BEFORE UPDATE ON reward_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
GRANT ALL ON ALL TABLES    IN SCHEMA public TO masterplan;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO masterplan;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO masterplan;
