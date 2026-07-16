/**
 * OAuth 2.0 Provider — ChatGPT Custom GPT Actions 호환
 *
 * 흐름:
 *   1. /oauth/authorize  — 동의 화면 (page)
 *   2. /api/oauth/authorize/consent  — 동의 처리 → code 발급
 *   3. /api/oauth/token  — code 또는 refresh_token → access_token 교환
 *
 * 토큰 형식:
 *   - access_token:  oac_at_<64hex>
 *   - refresh_token: oac_rt_<64hex>
 *   - 둘 다 SHA-256 hash 로 oauth_tokens 에 저장
 */

import { createHash, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '@/lib/db/pool';

export const VALID_SCOPES = [
  'agents:read',
  'agents:execute',
  'balance:read',
  'balance:write',
] as const;

export const SCOPE_LABELS_KO: Record<string, string> = {
  'agents:read': '에이전트 목록 조회',
  'agents:execute': '에이전트 실행 (포인트 차감)',
  'balance:read': '잔액 조회',
  'balance:write': '잔액 변경 (충전/차감)',
};

export const ACCESS_TOKEN_TTL_SEC = 3600; // 1h
export const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30d
export const CODE_TTL_SEC = 600; // 10 min

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateClientId(): string {
  return 'oac_' + randomBytes(8).toString('hex');
}

export function generateClientSecret(): string {
  return randomBytes(32).toString('hex');
}

export function generateAuthCode(): string {
  return randomBytes(32).toString('hex');
}

export function generateAccessToken(): string {
  return 'oac_at_' + randomBytes(32).toString('hex');
}

export function generateRefreshToken(): string {
  return 'oac_rt_' + randomBytes(32).toString('hex');
}

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(secret, hash);
  } catch {
    return false;
  }
}

export interface OAuthClient {
  id: string;
  client_id: string;
  client_secret_hash: string;
  name: string;
  description: string | null;
  redirect_uris: string[];
  scopes: string[];
  owner_id: string;
  is_confidential: boolean;
  logo_url: string | null;
  homepage_url: string | null;
  created_at: Date;
}

export async function getClientByClientId(clientId: string): Promise<OAuthClient | null> {
  const r = await query<OAuthClient>(
    `SELECT id, client_id, client_secret_hash, name, description, redirect_uris, scopes,
            owner_id, is_confidential, logo_url, homepage_url, created_at
       FROM oauth_clients WHERE client_id = $1 LIMIT 1`,
    [clientId],
  );
  return r.rows[0] ?? null;
}

export function isRedirectAllowed(client: OAuthClient, redirect_uri: string): boolean {
  return client.redirect_uris.includes(redirect_uri);
}

export function parseScope(scope: string | null | undefined): string[] {
  if (!scope) return [];
  return scope.split(/[\s,]+/).filter(Boolean);
}

export function validateScopes(requested: string[], allowed: string[]): { ok: boolean; valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const s of requested) {
    if (allowed.includes(s) && (VALID_SCOPES as readonly string[]).includes(s)) {
      valid.push(s);
    } else {
      invalid.push(s);
    }
  }
  return { ok: invalid.length === 0, valid, invalid };
}

/**
 * PKCE 검증.
 * - method='S256': BASE64URL(SHA256(verifier)) == challenge
 * - method='plain': verifier == challenge
 */
export function verifyPkce(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain',
): boolean {
  if (method === 'plain') {
    if (verifier.length !== challenge.length) return false;
    try {
      return timingSafeEqual(Buffer.from(verifier), Buffer.from(challenge));
    } catch {
      return false;
    }
  }
  // S256: base64url-encoded SHA-256 of verifier
  const hash = createHash('sha256').update(verifier).digest();
  const b64url = hash.toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  if (b64url.length !== challenge.length) return false;
  try {
    return timingSafeEqual(Buffer.from(b64url), Buffer.from(challenge));
  } catch {
    return false;
  }
}

/**
 * Build redirect URI with query params (preserves existing query).
 */
export function buildRedirect(redirectUri: string, params: Record<string, string | undefined>): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return url.toString();
}
