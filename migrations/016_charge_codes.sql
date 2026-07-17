-- 016: charge_codes (충전 코드)
--
-- 이 테이블은 원래 repositories/charge-codes.ts 의 ensureTable() 안에서 런타임에
-- 인라인 생성됐다. 그 방식은 접근 경로가 둘일 때 깨진다 — redeemCode() 는 ensureTable() 을
-- 호출하지만 /api/admin/charge-codes 라우트는 리포지토리를 우회해 직접 조회하므로,
-- 충전 코드가 한 번도 사용된 적 없는 환경에서는 관리자 목록이 500 을 냈다.
-- (실측 2026-07-17: relation "charge_codes" does not exist)
--
-- 이 파일이 charge_codes DDL 의 단일 출처다. ensureTable() 의 DDL 은 제거했다.
-- 003 이 reward_config / auction_requests / matching_requests 를 인라인에서 마이그레이션으로
-- 옮긴 것과 같은 흐름이며, 이 파일은 charge_codes 에 대해 그 이관을 완결한다.
--
-- 스키마는 ensureTable() 이 만들던 것과 동일하다(기존 환경과의 호환 유지).

CREATE TABLE IF NOT EXISTS charge_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(50) UNIQUE NOT NULL,
    points     INTEGER NOT NULL,
    status     VARCHAR(20) DEFAULT 'active',
    used_by    UUID REFERENCES users(id),
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charge_codes_code ON charge_codes(code);
CREATE INDEX IF NOT EXISTS idx_charge_codes_status ON charge_codes(status);
