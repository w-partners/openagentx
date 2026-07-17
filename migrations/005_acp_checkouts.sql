-- 005: ACP checkout sessions
-- Agentic Commerce Protocol 체크아웃 흐름 (acp/checkouts/*)

CREATE TABLE IF NOT EXISTS acp_checkout_sessions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_email           VARCHAR(255),
    buyer_first_name      VARCHAR(100),
    buyer_last_name       VARCHAR(100),
    status                VARCHAR(40) NOT NULL DEFAULT 'not_ready_for_payment',
    items                 JSONB       NOT NULL DEFAULT '[]',
    total_amount          BIGINT      NOT NULL DEFAULT 0,
    stripe_payment_token  TEXT,
    order_id              UUID,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acp_checkout_status   ON acp_checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_acp_checkout_email    ON acp_checkout_sessions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_acp_checkout_created  ON acp_checkout_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acp_checkout_order_id ON acp_checkout_sessions(order_id) WHERE order_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_acp_checkout_updated ON acp_checkout_sessions;
CREATE TRIGGER trg_acp_checkout_updated
    BEFORE UPDATE ON acp_checkout_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
