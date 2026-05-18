-- 0042_disputes.sql — 분쟁 처리 (Beta 최소 구현)
-- 정본: docs/PRD-OpenAgentX.md §4.11 (결정 23) Beta.
--
-- 적용 전 마스터 승인 필수 (DB 변경).

CREATE TABLE IF NOT EXISTS disputes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    claimant_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason        TEXT NOT NULL,
    evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
    resolution    TEXT,
    resolved_by   UUID REFERENCES users(id),
    refund_amount NUMERIC(18, 6),
    refund_currency TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_claimant
    ON disputes(claimant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_job
    ON disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status
    ON disputes(status, created_at DESC);

-- 중복 open/under_review 분쟁 차단 (1 job당 최대 1개 활성)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_disputes_active_per_job
    ON disputes(job_id)
    WHERE status IN ('open', 'under_review');
