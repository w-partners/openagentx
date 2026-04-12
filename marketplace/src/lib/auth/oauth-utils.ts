import { createHash, randomBytes } from 'crypto';
import { query } from '@/lib/db/pool';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateCode(): string {
  return randomBytes(32).toString('hex');
}

let _tablesEnsured = false;

export async function ensureOAuthTables(): Promise<void> {
  if (_tablesEnsured) return;
  await query(
    `CREATE TABLE IF NOT EXISTS oauth_tokens (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), access_token_hash VARCHAR(255) NOT NULL, refresh_token_hash VARCHAR(255) NOT NULL, access_token_expires_at TIMESTAMPTZ NOT NULL, refresh_token_expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS oauth_codes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), code_hash VARCHAR(255) NOT NULL, redirect_uri TEXT, expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW())`,
  );
  _tablesEnsured = true;
}
