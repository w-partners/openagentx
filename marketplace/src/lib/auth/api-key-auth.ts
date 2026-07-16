import { NextRequest } from 'next/server';
import { validateUserKey } from '../db/repositories/user-api-keys';
import { query } from '../db/pool';
import { hashToken } from './oauth-utils';
import { sha256, parseScope } from './oauth-provider';

export interface UserApiKeyResult {
  valid: boolean;
  userId?: string;
  role?: string;
  /** OAuth client_id (only set for OAuth provider tokens) */
  clientId?: string;
  /** Scopes granted to this token (only set for OAuth provider tokens) */
  scopes?: string[];
  /** Source of authentication */
  source?: 'api_key' | 'oauth_legacy' | 'oauth_provider';
}

/**
 * Validate a user API key or OAuth access token from request headers.
 * Supports:
 *   - oax_*       : per-user API Keys
 *   - oax_at_*    : legacy OAuth access tokens (no client/scope)
 *   - oac_at_*    : OAuth 2.0 Provider access tokens (with client_id + scope)
 */
export async function validateUserApiKey(request: NextRequest): Promise<UserApiKeyResult> {
  const key =
    request.headers.get('X-API-Key') ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!key) return { valid: false };

  // OAuth 2.0 Provider access token (oac_at_*)
  if (key.startsWith('oac_at_')) {
    try {
      const hash = sha256(key);
      const result = await query<{
        user_id: string;
        client_id: string | null;
        scope: string | null;
      }>(
        `SELECT user_id, client_id, scope FROM oauth_tokens
          WHERE access_token_hash = $1
            AND revoked_at IS NULL
            AND access_token_expires_at > NOW()
          LIMIT 1`,
        [hash],
      );
      if (result.rows.length === 0) return { valid: false };
      const row = result.rows[0];
      const userResult = await query<{ role: string }>(
        'SELECT role FROM users WHERE id = $1',
        [row.user_id],
      );
      // best-effort last_used_at update
      await query('UPDATE oauth_tokens SET last_used_at = NOW() WHERE access_token_hash = $1', [hash]);
      return {
        valid: true,
        userId: row.user_id,
        role: userResult.rows[0]?.role,
        clientId: row.client_id ?? undefined,
        scopes: parseScope(row.scope),
        source: 'oauth_provider',
      };
    } catch {
      return { valid: false };
    }
  }

  // Legacy OAuth access token (oax_at_*)
  if (key.startsWith('oax_at_')) {
    try {
      const hash = hashToken(key);
      const result = await query<{ user_id: string }>(
        `SELECT user_id FROM oauth_tokens WHERE access_token_hash = $1 AND access_token_expires_at > NOW()`,
        [hash],
      );
      if (result.rows.length === 0) return { valid: false };
      const userResult = await query<{ role: string }>(
        'SELECT role FROM users WHERE id = $1',
        [result.rows[0].user_id],
      );
      return {
        valid: true,
        userId: result.rows[0].user_id,
        role: userResult.rows[0]?.role,
        source: 'oauth_legacy',
      };
    } catch {
      return { valid: false };
    }
  }

  // API Key (oax_*)
  if (key.startsWith('oax_')) {
    try {
      const result = await validateUserKey(key);
      if (!result) return { valid: false };
      return { valid: true, userId: result.userId, role: result.role, source: 'api_key' };
    } catch {
      return { valid: false };
    }
  }

  return { valid: false };
}

/**
 * Helper to enforce a required scope on OAuth provider tokens.
 * - api_key / oauth_legacy: pass (full access)
 * - oauth_provider: requires the scope to be present
 */
export function hasScope(auth: UserApiKeyResult, required: string): boolean {
  if (!auth.valid) return false;
  if (auth.source !== 'oauth_provider') return true;
  return (auth.scopes ?? []).includes(required);
}
