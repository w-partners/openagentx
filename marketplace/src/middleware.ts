import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';

const SUPPORTED_LOCALES = ['en', 'ko', 'ja', 'zh', 'es', 'fr'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'en';
const LOCALE_COOKIE = 'NEXT_LOCALE';

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] && (SUPPORTED_LOCALES as readonly string[]).includes(segments[0])) {
    return '/' + segments.slice(1).join('/');
  }
  return pathname;
}

async function getUserRoleFromCookie(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('access_token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '',
    );
    if (secret.length === 0) return null;
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

async function guardAdminRoute(
  request: NextRequest,
  pathname: string,
  locale: Locale,
): Promise<NextResponse | null> {
  const stripped = stripLocalePrefix(pathname);
  if (!stripped.startsWith('/dashboard/admin')) return null;

  const role = await getUserRoleFromCookie(request);

  if (role === null) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (!['admin', 'site_admin', 'platform_admin'].includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return null;
}

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isLocale(first)) return first;
  return null;
}

function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const languages = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of languages) {
    const short = lang.split('-')[0];
    if (isLocale(short)) return short;
    if (lang.startsWith('zh')) return 'zh';
  }
  return DEFAULT_LOCALE;
}

/** Paths that should never be locale-prefixed */
const IGNORED_PREFIXES = ['/api/', '/_next/', '/favicon.ico', '/.well-known/', '/chat'];

function shouldIgnore(pathname: string): boolean {
  return IGNORED_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * For API routes: inject x-user-id and x-user-role from JWT cookie
 * so that requireAuth() / requireAdmin() can read them.
 */
async function injectUserHeaders(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('access_token')?.value;
  if (!token) return NextResponse.next();

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '',
    );
    if (secret.length === 0) return NextResponse.next();
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string | undefined;
    const role = payload.role as string | undefined;
    if (!userId) return NextResponse.next();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);
    if (role) requestHeaders.set('x-user-role', role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.next();
  }
}

/**
 * In-memory cache for enabled languages.
 * Middleware runs on Edge Runtime, so we cache to avoid DB calls per request.
 * The cache is refreshed via the internal API endpoint.
 */
let _enabledLangsCache: { langs: string[]; defaultLang: string; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

async function getEnabledLangs(request: NextRequest): Promise<{ langs: string[]; defaultLang: string }> {
  if (_enabledLangsCache && Date.now() - _enabledLangsCache.ts < CACHE_TTL) {
    return _enabledLangsCache;
  }
  try {
    // Use internal fetch to API (with admin cookie forwarded for auth)
    const url = new URL('/api/admin/settings/languages', request.nextUrl.origin);
    const res = await fetch(url.toString(), {
      headers: { 'x-internal': '1' },
    });
    if (res.ok) {
      const data = await res.json();
      const result = {
        langs: data.enabled_languages || SUPPORTED_LOCALES.slice(),
        defaultLang: data.default_language || DEFAULT_LOCALE,
        ts: Date.now(),
      };
      _enabledLangsCache = result;
      return result;
    }
  } catch {
    // fallback
  }
  return { langs: SUPPORTED_LOCALES.slice() as unknown as string[], defaultLang: DEFAULT_LOCALE };
}

/**
 * Check if a locale is enabled; if not, return the default locale.
 */
function resolveLocale(locale: Locale, enabledLangs: string[], defaultLang: string): Locale {
  if (enabledLangs.includes(locale)) return locale;
  if (isLocale(defaultLang)) return defaultLang;
  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldIgnore(pathname)) {
    // For API routes, inject user headers from JWT cookie
    if (pathname.startsWith('/api/')) {
      return injectUserHeaders(request);
    }
    return NextResponse.next();
  }

  const { langs: enabledLangs, defaultLang } = await getEnabledLangs(request);
  const pathLocale = getLocaleFromPath(pathname);

  if (pathLocale) {
    // If locale in URL is disabled, redirect to default language
    const resolved = resolveLocale(pathLocale, enabledLangs, defaultLang);
    if (resolved !== pathLocale) {
      const strippedPath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/') || '/';
      const url = request.nextUrl.clone();
      url.pathname = `/${resolved}${strippedPath === '/' ? '' : strippedPath}`;
      const response = NextResponse.redirect(url);
      response.cookies.set(LOCALE_COOKIE, resolved, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
      return response;
    }

    const adminBlock = await guardAdminRoute(request, pathname, pathLocale);
    if (adminBlock) return adminBlock;

    const strippedPath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/') || '/';
    const url = request.nextUrl.clone();
    url.pathname = strippedPath;

    const headers = new Headers(request.headers);
    headers.set('x-locale', pathLocale);

    const response = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.set(LOCALE_COOKIE, pathLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  let locale: Locale = DEFAULT_LOCALE;
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const acceptLang = request.headers.get('accept-language');
    locale = detectLocaleFromHeader(acceptLang);
  }

  // Ensure locale is enabled
  locale = resolveLocale(locale, enabledLangs, defaultLang);

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
