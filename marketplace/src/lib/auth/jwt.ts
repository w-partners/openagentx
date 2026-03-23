import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cacheGet, cacheSet } from '../cache/redis';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY, type UserPayload } from './constants';
import { config } from '../config/env';

const SECRET = new TextEncoder().encode(config.NEXTAUTH_SECRET);

interface TokenPayload extends JWTPayload {
  userId: string;
  role: string;
}

export async function createAccessToken(user: UserPayload): Promise<string> {
  return new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
    .sign(SECRET);
}

export async function createRefreshToken(user: UserPayload): Promise<string> {
  const token = await new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRY}s`)
    .sign(SECRET);

  // Store in Redis for validation
  await cacheSet(`refresh:${user.id}`, token, REFRESH_TOKEN_EXPIRY);
  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // Check blacklist
    const blacklisted = await cacheGet<boolean>(`blacklist:${token.slice(-16)}`);
    if (blacklisted) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export async function blacklistToken(token: string, expirySeconds: number): Promise<void> {
  await cacheSet(`blacklist:${token.slice(-16)}`, true, expirySeconds);
}

export async function rotateRefreshToken(
  oldToken: string,
  user: UserPayload,
): Promise<{ accessToken: string; refreshToken: string }> {
  // Blacklist old token and create new access token in parallel (independent operations)
  const [, accessToken] = await Promise.all([
    blacklistToken(oldToken, REFRESH_TOKEN_EXPIRY),
    createAccessToken(user),
  ]);

  // Create refresh token (depends on nothing above, but must be awaited for return)
  const refreshToken = await createRefreshToken(user);
  return { accessToken, refreshToken };
}
