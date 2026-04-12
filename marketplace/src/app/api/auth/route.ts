import { NextRequest } from 'next/server';
import {
  registerUser,
  loginWithEmail,
  loginWithWallet,
  loginWithGoogle,
  generateNonce,
  registerSchema,
  loginSchema,
  walletLoginSchema,
  googleLoginSchema,
} from '@/lib/auth/config';
import { createAccessToken, createRefreshToken, verifyToken, rotateRefreshToken, blacklistToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/pool';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '@/lib/auth/config';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import * as referralRepo from '@/lib/db/repositories/referrals';
import { processSignupBonus } from '@/lib/db/repositories/rewards';
import { NextResponse } from 'next/server';

function isSecureContext(): boolean {
  // Behind Cloudflare proxy — always HTTPS to end users
  return process.env.COOKIE_SECURE === 'true';
}

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string): NextResponse {
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
}

// POST /api/auth — action-based routing
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiJson({ error: '잘못된 JSON 형식입니다' }, 400);
  }
  const action = body.action as string;

  switch (action) {
    case 'register': {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return apiJson({ error: parsed.error.issues[0].message }, 400);
      }
      try {
        const user = await registerUser(parsed.data);

        // Apply referral code if provided
        const referralCode = body.referralCode as string | undefined;
        if (referralCode && typeof referralCode === 'string' && referralCode.startsWith('OAX-')) {
          try {
            await referralRepo.applyReferral(user.id, referralCode);
          } catch {
            // Silently ignore invalid referral codes during registration
          }
        }

        // 신규 가입 무료 체험 크레딧 지급
        const bonusAmount = await processSignupBonus(user.id).catch(() => 0);

        const accessToken = await createAccessToken(user);
        const refreshToken = await createRefreshToken(user);

        const response = apiJson({ data: { user, accessToken, signupBonus: bonusAmount } });
        return setAuthCookies(response, accessToken, refreshToken);
      } catch (err) {
        return apiCatchError(err, 409);
      }
    }

    case 'login': {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return apiJson({ error: parsed.error.issues[0].message }, 400);
      }
      try {
        const user = await loginWithEmail(parsed.data);
        const accessToken = await createAccessToken(user);
        const refreshToken = await createRefreshToken(user);

        const response = apiJson({ data: { user, accessToken } });
        return setAuthCookies(response, accessToken, refreshToken);
      } catch (err) {
        return apiCatchError(err, 401);
      }
    }

    case 'wallet-nonce': {
      const address = body.address as string;
      if (!address?.startsWith('0x') || address.length !== 42) {
        return apiJson({ error: '유효하지 않은 지갑 주소입니다' }, 400);
      }
      const nonce = await generateNonce(address);
      return apiJson({ data: { nonce } });
    }

    case 'wallet-login': {
      const parsed = walletLoginSchema.safeParse(body);
      if (!parsed.success) {
        return apiJson({ error: parsed.error.issues[0].message }, 400);
      }
      try {
        const user = await loginWithWallet(parsed.data);
        const accessToken = await createAccessToken(user);
        const refreshToken = await createRefreshToken(user);

        const response = apiJson({ data: { user, accessToken } });
        return setAuthCookies(response, accessToken, refreshToken);
      } catch (err) {
        return apiCatchError(err, 401);
      }
    }

    case 'google-login': {
      const parsed = googleLoginSchema.safeParse(body);
      if (!parsed.success) {
        return apiJson({ error: parsed.error.issues[0].message }, 400);
      }
      try {
        // Verify Google ID token
        const tokenRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${parsed.data.credential}`,
        );
        if (!tokenRes.ok) {
          return apiJson({ error: 'Google 토큰 검증에 실패했습니다' }, 401);
        }
        const tokenInfo = await tokenRes.json();

        // Verify audience matches our client ID
        if (process.env.GOOGLE_CLIENT_ID && tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
          return apiJson({ error: 'Google 토큰의 대상이 올바르지 않습니다' }, 401);
        }

        if (!tokenInfo.email) {
          return apiJson({ error: 'Google 계정에 이메일이 없습니다' }, 400);
        }

        const user = await loginWithGoogle({
          email: tokenInfo.email,
          name: tokenInfo.name || tokenInfo.email.split('@')[0],
          googleId: tokenInfo.sub,
          avatarUrl: tokenInfo.picture,
        });

        // Process signup bonus for new users (idempotent — won't double-grant)
        const bonusAmount = await processSignupBonus(user.id).catch(() => 0);

        const accessToken = await createAccessToken(user);
        const refreshToken = await createRefreshToken(user);

        const response = apiJson({ data: { user, accessToken, signupBonus: bonusAmount } });
        return setAuthCookies(response, accessToken, refreshToken);
      } catch (err) {
        return apiCatchError(err, 401);
      }
    }

    case 'refresh': {
      const refreshToken = request.cookies.get('refresh_token')?.value;
      if (!refreshToken) {
        return apiJson({ error: '리프레시 토큰이 없습니다' }, 401);
      }
      const payload = await verifyToken(refreshToken);
      if (!payload) {
        return apiJson({ error: '리프레시 토큰이 만료되었습니다' }, 401);
      }

      // Get user from DB for fresh data
      const userResult = await query<{ id: string; email: string | null; nickname: string; role: string; wallet_address: string | null }>(
        'SELECT id, email, nickname, role, wallet_address FROM users WHERE id = $1',
        [payload.userId],
      );
      if (userResult.rows.length === 0) {
        return apiJson({ error: '사용자를 찾을 수 없습니다' }, 401);
      }

      const user = {
        id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        nickname: userResult.rows[0].nickname,
        role: userResult.rows[0].role,
        walletAddress: userResult.rows[0].wallet_address,
      };

      const tokens = await rotateRefreshToken(refreshToken, user);
      const response = apiJson({ data: { user, accessToken: tokens.accessToken } });
      return setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    }

    case 'logout': {
      const refreshToken = request.cookies.get('refresh_token')?.value;
      if (refreshToken) {
        await blacklistToken(refreshToken, REFRESH_TOKEN_EXPIRY);
      }
      const response = apiJson({ data: { message: 'Logged out' } });
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    default:
      return apiJson({ error: '알 수 없는 액션입니다' }, 400);
  }
}
