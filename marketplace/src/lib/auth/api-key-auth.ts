import { NextRequest } from 'next/server';
import { validateUserKey } from '../db/repositories/user-api-keys';
import { query } from '../db/pool';
import { hashToken } from './oauth-utils';

export interface UserApiKeyResult {
  valid: boolean;
  userId?: string;
  role?: string;
}

/**
 * Validate a user API key or OAuth access token from request headers.
 * Supports: oax_ API keys, oax_at_ OAuth access tokens
 */
export async function validateUserApiKey(request: NextRequest): Promise<UserApiKeyResult> {
  const key =
    request.headers.get('X-API-Key') ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!key) return { valid: false };

  // OAuth access token
  if (key.startsWith('oax_at_')) {
    try {
      const hash = hashToken(key);
      const result = await query<{ user_id: string }>(
        `SELECT user_id FROM oauth_tokens WHERE access_token_hash = $1 AND access_token_expires_at > NOW()`,
        [hash],
      );
      if (result.rows.length === 0) return { valid: false };
      const userResult = await query<{ role: string }>('SELECT role FROM users WHERE id = $1', [result.rows[0].user_id]);
      return { valid: true, userId: result.rows[0].user_id, role: userResult.rows[0]?.role };
    } catch {
      return { valid: false };
    }
  }

  // API Key
  if (key.startsWith('oax_')) {
    try {
      const result = await validateUserKey(key);
      if (!result) return { valid: false };
      return { valid: true, userId: result.userId, role: result.role };
    } catch {
      return { valid: false };
    }
  }

  return { valid: false };
}
