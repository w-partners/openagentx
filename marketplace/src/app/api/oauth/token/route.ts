import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { randomBytes } from 'crypto';
import { hashToken, ensureOAuthTables } from '@/lib/auth/oauth-utils';

export async function POST(request: NextRequest) {
  try {
    await ensureOAuthTables();
    const contentType = request.headers.get('content-type') ?? '';
    let body: Record<string, string>;
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    } else {
      body = await request.json();
    }
    const grantType = body.grant_type;
    if (grantType === 'authorization_code') {
      const code = body.code;
      if (!code) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      const codeHash = hashToken(code);
      const codeResult = await query<{ user_id: string }>(`SELECT user_id FROM oauth_codes WHERE code_hash = $1 AND used = FALSE AND expires_at > NOW()`, [codeHash]);
      if (codeResult.rows.length === 0) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      await query(`UPDATE oauth_codes SET used = TRUE WHERE code_hash = $1`, [codeHash]);
      const userId = codeResult.rows[0].user_id;
      const accessToken = 'oax_at_' + randomBytes(32).toString('hex');
      const refreshToken = 'oax_rt_' + randomBytes(32).toString('hex');
      await query(`INSERT INTO oauth_tokens (user_id, access_token_hash, refresh_token_hash, access_token_expires_at, refresh_token_expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days')`, [userId, hashToken(accessToken), hashToken(refreshToken)]);
      return NextResponse.json({ access_token: accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: refreshToken });
    }
    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token;
      if (!refreshToken) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      const rtHash = hashToken(refreshToken);
      const tokenResult = await query<{ id: string; user_id: string }>(`SELECT id, user_id FROM oauth_tokens WHERE refresh_token_hash = $1 AND refresh_token_expires_at > NOW()`, [rtHash]);
      if (tokenResult.rows.length === 0) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      await query(`DELETE FROM oauth_tokens WHERE id = $1`, [tokenResult.rows[0].id]);
      const newAt = 'oax_at_' + randomBytes(32).toString('hex');
      const newRt = 'oax_rt_' + randomBytes(32).toString('hex');
      await query(`INSERT INTO oauth_tokens (user_id, access_token_hash, refresh_token_hash, access_token_expires_at, refresh_token_expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days')`, [tokenResult.rows[0].user_id, hashToken(newAt), hashToken(newRt)]);
      return NextResponse.json({ access_token: newAt, token_type: 'bearer', expires_in: 3600, refresh_token: newRt });
    }
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
