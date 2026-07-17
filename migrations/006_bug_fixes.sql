-- 006: 코드↔스키마 불일치 수정
-- 1) bounties 컬럼명 정정 (코드는 creator_id/deadline/selected_agent_id/job_id/metadata 사용)
-- 2) chain executor가 사용하는 chain_instance_id/chain_step_index 컬럼 3개 테이블에 추가

-- ============================================================
-- bounties: 컬럼 rename + metadata 추가
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bounties' AND column_name='poster_id') THEN
    ALTER TABLE bounties RENAME COLUMN poster_id TO creator_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bounties' AND column_name='expires_at') THEN
    ALTER TABLE bounties RENAME COLUMN expires_at TO deadline;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bounties' AND column_name='matched_agent_id') THEN
    ALTER TABLE bounties RENAME COLUMN matched_agent_id TO selected_agent_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bounties' AND column_name='matched_job_id') THEN
    ALTER TABLE bounties RENAME COLUMN matched_job_id TO job_id;
  END IF;
END $$;

ALTER TABLE bounties ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 인덱스 이름 정합성 (구 인덱스가 rename된 컬럼명을 가질 수 있음)
DROP INDEX IF EXISTS idx_bounties_poster;
CREATE INDEX IF NOT EXISTS idx_bounties_creator ON bounties(creator_id);
DROP INDEX IF EXISTS idx_bounties_expires;
CREATE INDEX IF NOT EXISTS idx_bounties_deadline ON bounties(deadline) WHERE status = 'open';

-- ============================================================
-- chain executor 지원: 3개 테이블에 chain_instance_id/chain_step_index 컬럼 추가
-- ============================================================
ALTER TABLE matching_requests   ADD COLUMN IF NOT EXISTS chain_instance_id UUID REFERENCES chain_instances(id) ON DELETE SET NULL;
ALTER TABLE matching_requests   ADD COLUMN IF NOT EXISTS chain_step_index  INTEGER;
ALTER TABLE marketplace_jobs    ADD COLUMN IF NOT EXISTS chain_instance_id UUID REFERENCES chain_instances(id) ON DELETE SET NULL;
ALTER TABLE marketplace_jobs    ADD COLUMN IF NOT EXISTS chain_step_index  INTEGER;
ALTER TABLE auction_requests    ADD COLUMN IF NOT EXISTS chain_instance_id UUID REFERENCES chain_instances(id) ON DELETE SET NULL;
ALTER TABLE auction_requests    ADD COLUMN IF NOT EXISTS chain_step_index  INTEGER;

CREATE INDEX IF NOT EXISTS idx_matching_chain   ON matching_requests(chain_instance_id) WHERE chain_instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mjobs_chain      ON marketplace_jobs(chain_instance_id) WHERE chain_instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_chain    ON auction_requests(chain_instance_id) WHERE chain_instance_id IS NOT NULL;

-- ============================================================
-- 권한
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
