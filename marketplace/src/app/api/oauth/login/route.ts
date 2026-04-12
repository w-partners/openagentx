import { NextRequest, NextResponse } from 'next/server';
import { loginWithEmail, loginSchema } from '@/lib/auth/config';
import { query } from '@/lib/db/pool';
import { hashToken, generateCode, ensureOAuthTables } from '@/lib/auth/oauth-utils';

export async function POST(request: NextRequest) {
  try {
    await ensureOAuthTables();
    const body = await request.json();
    const { email, password, redirectUri, state } = body;
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return NextResponse.json({ error: '이메일 또는 비밀번호를 확인해주세요' }, { status: 400 });
    const user = await loginWithEmail(parsed.data);
    const code = generateCode();
    await query(`INSERT INTO oauth_codes (user_id, code_hash, redirect_uri, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')`, [user.id, hashToken(code), redirectUri]);
    const redirect = new URL(redirectUri);
    redirect.searchParams.set('code', code);
    if (state) redirect.searchParams.set('state', state);
    return NextResponse.json({ redirectUrl: redirect.toString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '로그인 실패' }, { status: 401 });
  }
}
