import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { rateLimitIncr } from '../cache/redis';
import { validateKey } from '../db/repositories/api-keys';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/agents',
  '/bounties',
  '/about',
  '/builders',
  '/docs',
  '/api/auth',
  '/api/agents',
  '/api/bounties',
  '/api/fulfill',
  '/api/inngest',
  '/api/telegram',
  '/api/concierge',
  '/api/mcp',
  '/api/chat',
  '/api/v1',
  '/api/oauth',
  '/oauth',
  '/.well-known',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Rate limiting (sliding window per IP)
const RATE_LIMITS: Record<string, { max: number; windowSec: number }> = {
  auth: { max: 10, windowSec: 60 },
  default: { max: 60, windowSec: 60 },
};

async function checkRateLimit(ip: string, category: string): Promise<boolean> {
  const limit = RATE_LIMITS[category] ?? RATE_LIMITS.default;
  const key = `ratelimit:${category}:${ip}`;
  return rateLimitIncr(key, limit.windowSec, limit.max);
}

export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (isPublicPath(pathname)) return null;

  // Rate limiting (fail-open: if Redis is down, allow the request)
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const category = pathname.startsWith('/api/auth') ? 'auth' : 'default';
    const allowed = await checkRateLimit(ip, category);
    if (!allowed) {
      return NextResponse.json({ success: false, error: '요청 한도 초과' }, { status: 429 });
    }
  } catch {
    // Redis unavailable — allow request through
  }

  // --- API Key authentication (X-API-Key header) ---
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    try {
      const result = await validateKey(apiKey);
      if (!result) {
        return NextResponse.json({ success: false, error: '유효하지 않은 API 키입니다' }, { status: 401 });
      }
      const response = NextResponse.next();
      response.headers.set('x-user-id', result.userId);
      response.headers.set('x-user-role', result.role);
      return response;
    } catch {
      return NextResponse.json({ success: false, error: 'API 키 검증 실패' }, { status: 500 });
    }
  }

  // --- JWT verification (Bearer token or cookie) ---
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    // Check cookie fallback
    const tokenCookie = request.cookies.get('access_token');
    if (!tokenCookie) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다' }, { status: 401 });
    }
    const payload = await verifyToken(tokenCookie.value);
    if (!payload) {
      return NextResponse.json({ success: false, error: '토큰이 만료되었습니다' }, { status: 401 });
    }
    // Inject user info into headers for downstream
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-role', payload.role);
    return response;
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: '토큰이 만료되었습니다' }, { status: 401 });
  }

  const response = NextResponse.next();
  response.headers.set('x-user-id', payload.userId);
  response.headers.set('x-user-role', payload.role);
  return response;
}

// Role check helper for API routes
export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}
