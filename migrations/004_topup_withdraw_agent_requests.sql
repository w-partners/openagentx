-- 004: topup_requests, withdrawals, agent_build_requests + 누락 user 컬럼
-- 운영 사이트 점검 후 발견된 잔여 누락 스키마 보완

-- ============================================================
-- users: 누락 컬럼 추가
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_pin       VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_failed_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata          JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id         VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- ============================================================
-- topup_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS topup_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          NUMERIC(12, 4) NOT NULL,
    currency        VARCHAR(10) NOT NULL DEFAULT 'KRW',
    points          INTEGER,
    payment_method  VARCHAR(20) NOT NULL DEFAULT 'manual',
    payment_id      VARCHAR(255) UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_note      TEXT,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topup_user    ON topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_status  ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_created ON topup_requests(created_at DESC);

-- ============================================================
-- withdrawals
-- ============================================================
CREATE TABLE IF NOT EXISTS withdrawals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          NUMERIC(12, 4) NOT NULL,
    currency        VARCHAR(10) NOT NULL DEFAULT 'USDC',
    method          VARCHAR(30) NOT NULL,
    bank_name       VARCHAR(100),
    account_number  VARCHAR(100),
    account_holder  VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_note      TEXT,
    processed_by    UUID REFERENCES users(id),
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user    ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status  ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawals(created_at DESC);

-- ============================================================
-- agent_build_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_build_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    title            VARCHAR(200) NOT NULL,
    description      TEXT NOT NULL,
    category         VARCHAR(50) NOT NULL DEFAULT 'general',
    urgency          VARCHAR(20) NOT NULL DEFAULT 'normal',
    source_urls      TEXT[] NOT NULL DEFAULT '{}',
    attachments      JSONB NOT NULL DEFAULT '[]',
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    assigned_to      UUID REFERENCES users(id),
    result_agent_id  UUID REFERENCES agents(id),
    admin_notes      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_abr_requester ON agent_build_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_abr_status    ON agent_build_requests(status);
CREATE INDEX IF NOT EXISTS idx_abr_created   ON agent_build_requests(created_at DESC);

-- ============================================================
-- updated_at 트리거 (이미 함수 존재)
-- ============================================================
DROP TRIGGER IF EXISTS trg_agent_build_requests_updated ON agent_build_requests;
CREATE TRIGGER trg_agent_build_requests_updated
    BEFORE UPDATE ON agent_build_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 권한
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO masterplan;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO masterplan;
