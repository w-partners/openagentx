import { randomBytes, createHash } from 'crypto';
import { query } from '../pool';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key for the user.
 * Returns the raw key (only shown once) and the stored record.
 */
export async function createKey(
  userId: string,
  name: string,
): Promise<{ rawKey: string; record: ApiKey }> {
  const raw = `oax_${randomBytes(32).toString('hex')}`;
  const prefix = raw.slice(0, 8);
  const hash = hashKey(raw);

  const result = await query<ApiKey>(
    `INSERT INTO api_keys (user_id, name, key_prefix, key_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, key_prefix, last_used_at, created_at, revoked_at`,
    [userId, name, prefix, hash],
  );

  return { rawKey: raw, record: result.rows[0] };
}

/**
 * Validate an API key and return the associated userId + role.
 * Updates last_used_at on success.
 */
export async function validateKey(
  key: string,
): Promise<{ userId: string; role: string } | null> {
  const hash = hashKey(key);

  const result = await query<{ user_id: string; role: string }>(
    `SELECT ak.user_id, u.role
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1 AND ak.revoked_at IS NULL`,
    [hash],
  );

  if (result.rows.length === 0) return null;

  // Fire-and-forget last_used_at update
  query('UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1', [hash]).catch(() => {});

  return { userId: result.rows[0].user_id, role: result.rows[0].role };
}

/**
 * List all API keys for a user (never returns the hash).
 */
export async function listKeys(userId: string): Promise<ApiKey[]> {
  const result = await query<ApiKey>(
    `SELECT id, user_id, name, key_prefix, last_used_at, created_at, revoked_at
     FROM api_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Revoke an API key. Only the owner can revoke.
 */
export async function revokeKey(keyId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE api_keys SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [keyId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
