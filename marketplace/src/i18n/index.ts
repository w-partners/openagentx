import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  detectLocaleFromHeader,
  getTranslations,
} from './config';
import type { Locale, Dictionary } from './config';

// Re-export everything from config for convenience in server components
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_NAMES,
  LOCALE_FLAGS,
  isLocale,
  getTranslations,
  detectLocaleFromHeader,
  getLocaleFromPath,
  removeLocaleFromPath,
  addLocaleToPath,
} from './config';
export type { Locale, Dictionary } from './config';

/**
 * Fetch enabled languages from DB.
 * Returns { enabledLanguages, defaultLanguage } or null on failure.
 * Cached in-memory for 60 seconds to avoid hammering DB on every request.
 */
let _langCache: { enabledLanguages: string[]; defaultLanguage: string; ts: number } | null = null;
const LANG_CACHE_TTL = 60_000; // 60 seconds

async function getEnabledLanguages(): Promise<{ enabledLanguages: string[]; defaultLanguage: string } | null> {
  if (_langCache && Date.now() - _langCache.ts < LANG_CACHE_TTL) {
    return _langCache;
  }
  try {
    const { query } = await import('@/lib/db/pool');
    const result = await query<{ key: string; value: unknown }>(
      "SELECT key, value FROM site_settings WHERE key IN ('enabled_languages', 'default_language')"
    );
    let enabledLanguages: string[] | null = null;
    let defaultLanguage: string | null = null;
    for (const row of result.rows) {
      if (row.key === 'enabled_languages' && Array.isArray(row.value)) {
        enabledLanguages = row.value as string[];
      }
      if (row.key === 'default_language' && typeof row.value === 'string') {
        defaultLanguage = row.value;
      }
    }
    if (enabledLanguages) {
      const data = {
        enabledLanguages,
        defaultLanguage: defaultLanguage || DEFAULT_LOCALE,
        ts: Date.now(),
      };
      _langCache = data;
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/** Server-side: get current locale from middleware header, cookie, or accept-language */
export async function getLocale(): Promise<Locale> {
  try {
    // 1. Middleware injects x-locale header on rewrite (most reliable)
    const headerStore = await headers();
    const middlewareLocale = headerStore.get('x-locale');
    let locale: Locale = DEFAULT_LOCALE;

    if (middlewareLocale && isLocale(middlewareLocale)) {
      locale = middlewareLocale;
    } else {
      // 2. Cookie
      const cookieStore = await cookies();
      const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
      if (localeCookie && isLocale(localeCookie)) {
        locale = localeCookie;
      } else {
        // 3. Accept-Language header
        const acceptLang = headerStore.get('accept-language');
        locale = detectLocaleFromHeader(acceptLang);
      }
    }

    // 4. Check if locale is enabled; if not, fall back to default language
    const langSettings = await getEnabledLanguages();
    if (langSettings) {
      if (!langSettings.enabledLanguages.includes(locale)) {
        const fallback = langSettings.defaultLanguage;
        if (isLocale(fallback)) return fallback;
        return DEFAULT_LOCALE;
      }
    }

    return locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Server-side: get dictionary for current locale */
export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  return getTranslations(locale);
}
