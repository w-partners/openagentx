import { randomBytes, createHash } from 'crypto';
import { query } from '../pool';

export interface UserApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: Date | null;
  created_at: Date;
}

const MAX_KEYS_PER_USER = 5;

let _tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (_tableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS user_api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      name VARCHAR(100) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      key_prefix VARCHAR(20) NOT NULL,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_user_api_keys_prefix ON user_api_keys(key_prefix)');
  _tableEnsured = true;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key for the user.
 * Returns the raw key (only shown once) and the stored record.
 */
export async function createUserKey(
  userId: string,
  name: string,
): Promise<{ rawKey: string; record: UserApiKey }> {
  await ensureTable();

  // Check key count limit
  const countResult = await query<{ cnt: string }>(
    'SELECT COUNT(*)::text AS cnt FROM user_api_keys WHERE user_id = $1',
    [userId],
  );
  const count = parseInt(countResult.rows[0].cnt, 10);
  if (count >= MAX_KEYS_PER_USER) {
    throw new Error(`API Key는 최대 ${MAX_KEYS_PER_USER}개까지 생성할 수 있습니다`);
  }

  const raw = `oax_${randomBytes(16).toString('hex')}`;
  const prefix = raw.slice(0, 12);
  const hash = hashKey(raw);

  const result = await query<UserApiKey>(
    `INSERT INTO user_api_keys (user_id, name, key_hash, key_prefix)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, key_prefix, last_used_at, created_at`,
    [userId, name, hash, prefix],
  );

  return { rawKey: raw, record: result.rows[0] };
}

/**
 * Validate a user API key and return the associated userId + role.
 * Updates last_used_at on success.
 */
export async function validateUserKey(
  key: string,
): Promise<{ userId: string; role: string } | null> {
  await ensureTable();

  const hash = hashKey(key);

  const result = await query<{ user_id: string; role: string }>(
    `SELECT uk.user_id, u.role
     FROM user_api_keys uk
     JOIN users u ON u.id = uk.user_id
     WHERE uk.key_hash = $1`,
    [hash],
  );

  if (result.rows.length === 0) return null;

  // Fire-and-forget last_used_at update
  query('UPDATE user_api_keys SET last_used_at = NOW() WHERE key_hash = $1', [hash]).catch(() => {});

  return { userId: result.rows[0].user_id, role: result.rows[0].role };
}

/**
 * List all API keys for a user (never returns the hash).
 */
export async function listUserKeys(userId: string): Promise<UserApiKey[]> {
  await ensureTable();

  const result = await query<UserApiKey>(
    `SELECT id, user_id, name, key_prefix, last_used_at, created_at
     FROM user_api_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Delete an API key. Only the owner can delete.
 */
export async function deleteUserKey(keyId: string, userId: string): Promise<boolean> {
  await ensureTable();

  const result = await query(
    'DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2',
    [keyId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
