import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth/middleware';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  detectLocaleFromHeader,
  getLocaleFromPath,
  type Locale,
} from '@/i18n/config';

export const runtime = 'nodejs';

/** Paths that should never be locale-prefixed */
const IGNORED_PREFIXES = ['/api/', '/_next/', '/favicon.ico', '/.well-known/', '/chat'];

function shouldIgnore(pathname: string): boolean {
  return IGNORED_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale logic for API routes, static assets, etc.
  if (shouldIgnore(pathname)) {
    // Still apply auth middleware for API routes
    if (pathname.startsWith('/api/')) {
      const result = await authMiddleware(request);
      if (result) return result;
    }
    return NextResponse.next();
  }

  // Check if URL already has a locale prefix
  const pathLocale = getLocaleFromPath(pathname);

  if (pathLocale) {
    // URL has locale prefix: strip it for routing, set cookie
    const strippedPath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/') || '/';
    const url = request.nextUrl.clone();
    url.pathname = strippedPath;

    // Preserve query string
    const response = NextResponse.rewrite(url);
    response.cookies.set(LOCALE_COOKIE, pathLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  // No locale prefix: detect and redirect
  let locale: Locale = DEFAULT_LOCALE;

  // 1. Check cookie
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    // 2. Detect from Accept-Language header
    const acceptLang = request.headers.get('accept-language');
    locale = detectLocaleFromHeader(acceptLang);
  }

  // Redirect to locale-prefixed URL
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
