-- 009: OAuth 2.0 Provider (ChatGPT Custom GPT 호환)
-- 신규 테이블: oauth_clients, oauth_authorizations
-- 기존 oauth_tokens 확장: client_id, scope, revoked_at, last_used_at 컬럼 추가
-- 하위호환: 기존 oauth_tokens row (client_id NULL) 는 그대로 유지 — oax_at_ 흐름 유지

-- ========================================
-- 1) oauth_clients (마스터가 등록한 외부 앱)
-- ========================================
CREATE TABLE IF NOT EXISTS oauth_clients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          VARCHAR(64) UNIQUE NOT NULL,           -- oac_xxxxxxxx
  client_secret_hash VARCHAR(255) NOT NULL,                  -- bcrypt
  name               VARCHAR(100) NOT NULL,
  description        TEXT,
  redirect_uris      TEXT[] NOT NULL,                        -- whitelist
  scopes             TEXT[] NOT NULL DEFAULT ARRAY['agents:read','agents:execute','balance:read'],
  owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_confidential    BOOLEAN NOT NULL DEFAULT TRUE,
  logo_url           TEXT,
  homepage_url       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_owner ON oauth_clients(owner_id);

-- ========================================
-- 2) oauth_authorizations (1회용 authorization_code)
-- ========================================
CREATE TABLE IF NOT EXISTS oauth_authorizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       VARCHAR(64) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  code            VARCHAR(128) UNIQUE NOT NULL,
  code_challenge  VARCHAR(255),
  code_method     VARCHAR(10),
  redirect_uri    TEXT NOT NULL,
  scope           TEXT NOT NULL,
  state           TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  used            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_code ON oauth_authorizations(code) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_oauth_auth_user ON oauth_authorizations(user_id);

-- ========================================
-- 3) oauth_tokens 확장 (기존 테이블 유지하면서 OAuth 2.0 메타 추가)
-- ========================================
ALTER TABLE oauth_tokens
  ADD COLUMN IF NOT EXISTS client_id     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS scope         TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_used_at  TIMESTAMPTZ;

-- 기존 컬럼 NOT NULL 완화 (legacy 흐름 + 신규 흐름 호환)
ALTER TABLE oauth_tokens
  ALTER COLUMN refresh_token_hash DROP NOT NULL,
  ALTER COLUMN refresh_token_expires_at DROP NOT NULL;

-- expires_at 호환 컬럼: access_token_expires_at 가 expires_at 역할
-- (기존 코드 access_token_expires_at 사용 → 신규도 같이 사용)

-- access_token_hash 는 이미 NOT NULL. UNIQUE 보장.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'oauth_tokens_access_token_hash_key'
  ) THEN
    BEGIN
      ALTER TABLE oauth_tokens ADD CONSTRAINT oauth_tokens_access_token_hash_key UNIQUE (access_token_hash);
    EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user      ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client    ON oauth_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_refresh   ON oauth_tokens(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;

-- FK: oauth_tokens.client_id -> oauth_clients.client_id (NULL 허용 = legacy 흐름 유지)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_tokens_client_id_fkey') THEN
    ALTER TABLE oauth_tokens
      ADD CONSTRAINT oauth_tokens_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ========================================
-- 권한 부여
-- ========================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
