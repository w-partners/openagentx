import { NextRequest, NextResponse } from 'next/server';
import { loginWithGoogle } from '@/lib/auth/config';
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '@/lib/auth/config';
import { processSignupBonus } from '@/lib/db/repositories/rewards';

function isSecureContext(): boolean {
  return process.env.COOKIE_SECURE === 'true';
}

// GET /api/auth/google/callback — OAuth redirect flow
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=google_not_configured', request.url));
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenRes.json();

    // Verify and decode ID token
    const idTokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`,
    );
    if (!idTokenRes.ok) {
      return NextResponse.redirect(new URL('/login?error=token_verify_failed', request.url));
    }

    const userInfo = await idTokenRes.json();

    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    const user = await loginWithGoogle({
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      googleId: userInfo.sub,
      avatarUrl: userInfo.picture,
    });

    // Process signup bonus (idempotent)
    await processSignupBonus(user.id).catch(() => 0);

    const accessToken = await createAccessToken(user);
    const refreshToken = await createRefreshToken(user);

    const response = NextResponse.redirect(new URL('/', request.url));
    const secure = isSecureContext();

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_EXPIRY,
      path: '/',
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_EXPIRY,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=google_login_failed', request.url));
  }
}
