/**
 * POST /api/oauth/token  — Unified OAuth 2.0 Token Endpoint
 *
 * 두 가지 흐름 지원:
 *
 * 1) Client-aware (신규 OAuth 2.0 Provider)
 *    - 요청 body 에 client_id 포함 → oauth_clients 검증 → oauth_authorizations 사용
 *    - access_token: oac_at_*, refresh_token: oac_rt_*
 *
 * 2) Legacy (기존 oauth_codes 흐름, /api/oauth/login 와 연결)
 *    - client_id 없음 → oauth_codes 사용
 *    - access_token: oax_at_*, refresh_token: oax_rt_*
 *
 * Content-Type: application/x-www-form-urlencoded (ChatGPT 표준) 또는 application/json
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { randomBytes } from 'crypto';
import { hashToken, ensureOAuthTables } from '@/lib/auth/oauth-utils';
import {
  getClientByClientId,
  verifySecret,
  verifyPkce,
  generateAccessToken,
  generateRefreshToken,
  sha256,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
} from '@/lib/auth/oauth-provider';

function noStore(json: Record<string, unknown>, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
  });
}

function oauthError(error: string, description: string, status = 400) {
  return noStore({ error, error_description: description }, status);
}

async function parseBody(request: NextRequest): Promise<Record<string, string>> {
  const ct = (request.headers.get('content-type') ?? '').toLowerCase();
  if (ct.includes('application/json')) {
    const j = await request.json().catch(() => ({}));
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(j ?? {})) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  }
  // form-urlencoded (default per OAuth spec)
  if (ct.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries()) as Record<string, string>;
  }
  // best-effort: try urlencoded text
  const text = await request.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function parseBasicAuth(request: NextRequest): { client_id: string; client_secret: string } | null {
  const h = request.headers.get('authorization');
  if (!h?.toLowerCase().startsWith('basic ')) return null;
  try {
    const decoded = Buffer.from(h.slice(6).trim(), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return {
      client_id: decodeURIComponent(decoded.slice(0, idx)),
      client_secret: decodeURIComponent(decoded.slice(idx + 1)),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureOAuthTables();
    const body = await parseBody(request);
    const grantType = body.grant_type;

    const basic = parseBasicAuth(request);
    const clientId = basic?.client_id ?? body.client_id;
    const clientSecret = basic?.client_secret ?? body.client_secret;

    // === Client-aware path ===
    if (clientId) {
      const client = await getClientByClientId(clientId);
      if (!client) return oauthError('invalid_client', '알 수 없는 client_id', 401);
      if (client.is_confidential) {
        if (!clientSecret) return oauthError('invalid_client', 'client_secret 필수', 401);
        const ok = await verifySecret(clientSecret, client.client_secret_hash);
        if (!ok) return oauthError('invalid_client', 'client_secret 불일치', 401);
      }

      if (grantType === 'authorization_code') {
        return await handleAuthCodeNew(body, clientId);
      }
      if (grantType === 'refresh_token') {
        return await handleRefreshNew(body, clientId);
      }
      return oauthError('unsupported_grant_type', `지원되지 않는 grant_type: ${grantType ?? '(empty)'}`);
    }

    // === Legacy path (no client_id) ===
    if (grantType === 'authorization_code') {
      return await handleAuthCodeLegacy(body);
    }
    if (grantType === 'refresh_token') {
      return await handleRefreshLegacy(body);
    }
    return oauthError('unsupported_grant_type', `지원되지 않는 grant_type: ${grantType ?? '(empty)'}`);
  } catch (err) {
    return oauthError('server_error', err instanceof Error ? err.message : 'unknown', 500);
  }
}

// =====================================================
// New (client-aware) — oauth_authorizations + oauth_tokens(client_id)
// =====================================================

async function handleAuthCodeNew(body: Record<string, string>, clientId: string) {
  const { code, redirect_uri, code_verifier } = body;
  if (!code || !redirect_uri) {
    return oauthError('invalid_request', 'code, redirect_uri 필수');
  }

  const r = await query<{
    id: string;
    user_id: string;
    code_challenge: string | null;
    code_method: string | null;
    redirect_uri: string;
    scope: string;
    expires_at: Date;
    used: boolean;
  }>(
    `SELECT id, user_id, code_challenge, code_method, redirect_uri, scope, expires_at, used
       FROM oauth_authorizations
      WHERE code = $1 AND client_id = $2 LIMIT 1`,
    [code, clientId],
  );
  const auth = r.rows[0];
  if (!auth) return oauthError('invalid_grant', '유효하지 않은 code');
  if (auth.used) return oauthError('invalid_grant', '이미 사용된 code');
  if (new Date(auth.expires_at) < new Date()) return oauthError('invalid_grant', '만료된 code');
  if (auth.redirect_uri !== redirect_uri) {
    return oauthError('invalid_grant', 'redirect_uri 불일치');
  }
  if (auth.code_challenge) {
    if (!code_verifier) return oauthError('invalid_grant', 'PKCE code_verifier 필수');
    const method = (auth.code_method as 'S256' | 'plain') ?? 'S256';
    if (!verifyPkce(code_verifier, auth.code_challenge, method)) {
      return oauthError('invalid_grant', 'PKCE 검증 실패');
    }
  }

  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  const accessExp = new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000);
  const refreshExp = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);

  await transaction(async (c) => {
    await c.query('UPDATE oauth_authorizations SET used = TRUE WHERE id = $1', [auth.id]);
    await c.query(
      `INSERT INTO oauth_tokens
         (user_id, client_id, access_token_hash, refresh_token_hash, scope,
          access_token_expires_at, refresh_token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auth.user_id,
        clientId,
        sha256(accessToken),
        sha256(refreshToken),
        auth.scope,
        accessExp,
        refreshExp,
      ],
    );
  });

  return noStore({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: refreshToken,
    scope: auth.scope,
  });
}

async function handleRefreshNew(body: Record<string, string>, clientId: string) {
  const { refresh_token } = body;
  if (!refresh_token) return oauthError('invalid_request', 'refresh_token 필수');

  const hash = sha256(refresh_token);
  const r = await query<{
    id: string;
    user_id: string;
    scope: string;
    revoked_at: Date | null;
    refresh_token_expires_at: Date | null;
  }>(
    `SELECT id, user_id, scope, revoked_at, refresh_token_expires_at
       FROM oauth_tokens
      WHERE refresh_token_hash = $1 AND client_id = $2 LIMIT 1`,
    [hash, clientId],
  );
  const tok = r.rows[0];
  if (!tok) return oauthError('invalid_grant', '유효하지 않은 refresh_token');
  if (tok.revoked_at) return oauthError('invalid_grant', '취소된 refresh_token');
  if (tok.refresh_token_expires_at && new Date(tok.refresh_token_expires_at) < new Date()) {
    return oauthError('invalid_grant', '만료된 refresh_token');
  }

  const newAccess = generateAccessToken();
  const newRefresh = generateRefreshToken();
  const accessExp = new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000);
  const refreshExp = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);

  await transaction(async (c) => {
    await c.query('UPDATE oauth_tokens SET revoked_at = NOW() WHERE id = $1', [tok.id]);
    await c.query(
      `INSERT INTO oauth_tokens
         (user_id, client_id, access_token_hash, refresh_token_hash, scope,
          access_token_expires_at, refresh_token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tok.user_id,
        clientId,
        sha256(newAccess),
        sha256(newRefresh),
        tok.scope,
        accessExp,
        refreshExp,
      ],
    );
  });

  return noStore({
    access_token: newAccess,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: newRefresh,
    scope: tok.scope,
  });
}

// =====================================================
// Legacy (no client_id) — oauth_codes + oauth_tokens(client_id NULL)
// =====================================================

async function handleAuthCodeLegacy(body: Record<string, string>) {
  const code = body.code;
  if (!code) return oauthError('invalid_request', 'code 필수');
  const codeHash = hashToken(code);
  const codeResult = await query<{ user_id: string }>(
    `SELECT user_id FROM oauth_codes WHERE code_hash = $1 AND used = FALSE AND expires_at > NOW()`,
    [codeHash],
  );
  if (codeResult.rows.length === 0) return oauthError('invalid_grant', '유효하지 않은 code');
  await query(`UPDATE oauth_codes SET used = TRUE WHERE code_hash = $1`, [codeHash]);
  const userId = codeResult.rows[0].user_id;
  const accessToken = 'oax_at_' + randomBytes(32).toString('hex');
  const refreshToken = 'oax_rt_' + randomBytes(32).toString('hex');
  await query(
    `INSERT INTO oauth_tokens
       (user_id, access_token_hash, refresh_token_hash,
        access_token_expires_at, refresh_token_expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [userId, hashToken(accessToken), hashToken(refreshToken)],
  );
  return noStore({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
  });
}

async function handleRefreshLegacy(body: Record<string, string>) {
  const refreshToken = body.refresh_token;
  if (!refreshToken) return oauthError('invalid_request', 'refresh_token 필수');
  const rtHash = hashToken(refreshToken);
  const tokenResult = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM oauth_tokens
      WHERE refresh_token_hash = $1 AND refresh_token_expires_at > NOW()`,
    [rtHash],
  );
  if (tokenResult.rows.length === 0) return oauthError('invalid_grant', '유효하지 않은 refresh_token');
  await query(`DELETE FROM oauth_tokens WHERE id = $1`, [tokenResult.rows[0].id]);
  const newAt = 'oax_at_' + randomBytes(32).toString('hex');
  const newRt = 'oax_rt_' + randomBytes(32).toString('hex');
  await query(
    `INSERT INTO oauth_tokens
       (user_id, access_token_hash, refresh_token_hash,
        access_token_expires_at, refresh_token_expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [tokenResult.rows[0].user_id, hashToken(newAt), hashToken(newRt)],
  );
  return noStore({
    access_token: newAt,
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: newRt,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
