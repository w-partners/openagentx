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

/** Server-side: get current locale from cookie or header */
export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
    if (localeCookie && isLocale(localeCookie)) return localeCookie;

    const headerStore = await headers();
    const acceptLang = headerStore.get('accept-language');
    return detectLocaleFromHeader(acceptLang);
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Server-side: get dictionary for current locale */
export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  return getTranslations(locale);
}
