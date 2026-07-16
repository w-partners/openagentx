/**
 * POST /api/oauth/authorize/consent
 *
 * Body (JSON):
 *   decision: 'allow' | 'deny'
 *   client_id, redirect_uri, scope
 *   state? code_challenge? code_challenge_method?
 *
 * 응답:
 *   { redirect_url } 으로 클라이언트에서 location 변경.
 *
 * 사용자 인증: access_token 쿠키 (NextAuth-style).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/require-user';
import { query } from '@/lib/db/pool';
import {
  getClientByClientId,
  isRedirectAllowed,
  validateScopes,
  parseScope,
  generateAuthCode,
  buildRedirect,
  CODE_TTL_SEC,
} from '@/lib/auth/oauth-provider';

const schema = z.object({
  decision: z.enum(['allow', 'deny']),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().min(1),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['S256', 'plain']).optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const { decision, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method } =
    parsed.data;

  const client = await getClientByClientId(client_id);
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
  }
  if (!isRedirectAllowed(client, redirect_uri)) {
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
  }

  if (decision === 'deny') {
    return NextResponse.json({
      redirect_url: buildRedirect(redirect_uri, {
        error: 'access_denied',
        error_description: 'user denied consent',
        state,
      }),
    });
  }

  // allow path
  const requested = parseScope(scope);
  const scopeCheck = validateScopes(requested, client.scopes);
  if (!scopeCheck.ok) {
    return NextResponse.json({
      redirect_url: buildRedirect(redirect_uri, {
        error: 'invalid_scope',
        error_description: scopeCheck.invalid.join(','),
        state,
      }),
    });
  }

  // Issue authorization code
  const code = generateAuthCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000);
  await query(
    `INSERT INTO oauth_authorizations
       (user_id, client_id, code, code_challenge, code_method, redirect_uri, scope, state, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      user.userId,
      client_id,
      code,
      code_challenge ?? null,
      code_challenge_method ?? null,
      redirect_uri,
      scopeCheck.valid.join(' '),
      state ?? null,
      expiresAt,
    ],
  );

  return NextResponse.json({
    redirect_url: buildRedirect(redirect_uri, { code, state }),
  });
}
