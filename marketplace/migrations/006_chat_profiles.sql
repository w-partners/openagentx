-- UI-MESSENGER chat_profiles — POST /api/chat (bootstrap/login/message) 가 사용.
CREATE TABLE IF NOT EXISTS chat_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  display_name TEXT NOT NULL UNIQUE,
  gemini_key_encrypted TEXT NOT NULL DEFAULT '',
  passcode_hash TEXT NOT NULL,
  user_mode TEXT NOT NULL CHECK (user_mode IN ('user','provider','both')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  chat_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_profiles_display_name ON chat_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_chat_profiles_updated_at ON chat_profiles(updated_at DESC);
