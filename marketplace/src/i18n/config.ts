import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import vi from './locales/vi.json';
import id from './locales/id.json';
import th from './locales/th.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';

export const SUPPORTED_LOCALES = [
  'en', 'ko', 'ja', 'zh', 'es', 'fr',
  'de', 'it', 'pt', 'ru', 'vi', 'id', 'th', 'tr', 'ar', 'hi',
] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ko: '\uD55C\uAD6D\uC5B4',
  ja: '\u65E5\u672C\u8A9E',
  zh: '\u7B80\u4F53\u4E2D\u6587',
  es: 'Espa\u00F1ol',
  fr: 'Fran\u00E7ais',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Portugu\u00EAs',
  ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
  vi: 'Ti\u1EBFng Vi\u1EC7t',
  id: 'Bahasa Indonesia',
  th: '\u0E44\u0E17\u0E22',
  tr: 'T\u00FCrk\u00E7e',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
  hi: '\u0939\u093F\u0928\u094D\u0926\u0940',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: '\u{1F1FA}\u{1F1F8}',
  ko: '\u{1F1F0}\u{1F1F7}',
  ja: '\u{1F1EF}\u{1F1F5}',
  zh: '\u{1F1E8}\u{1F1F3}',
  es: '\u{1F1EA}\u{1F1F8}',
  fr: '\u{1F1EB}\u{1F1F7}',
  de: '\u{1F1E9}\u{1F1EA}',
  it: '\u{1F1EE}\u{1F1F9}',
  pt: '\u{1F1F5}\u{1F1F9}',
  ru: '\u{1F1F7}\u{1F1FA}',
  vi: '\u{1F1FB}\u{1F1F3}',
  id: '\u{1F1EE}\u{1F1E9}',
  th: '\u{1F1F9}\u{1F1ED}',
  tr: '\u{1F1F9}\u{1F1F7}',
  ar: '\u{1F1F8}\u{1F1E6}',
  hi: '\u{1F1EE}\u{1F1F3}',
};

const dictionaries: Record<Locale, typeof en> = {
  en, ko, ja, zh, es, fr,
  de, it, pt, ru, vi, id, th, tr, ar, hi,
};

export type Dictionary = typeof en;

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

/** Get translations for a given locale */
export function getTranslations(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Detect locale from Accept-Language header */
export function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
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

/** Extract locale from URL pathname */
export function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isLocale(first)) return first;
  return null;
}

/** Remove locale prefix from pathname */
export function removeLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isLocale(first)) {
    return '/' + segments.slice(1).join('/');
  }
  return pathname;
}

/** Add locale prefix to pathname */
export function addLocaleToPath(pathname: string, locale: Locale): string {
  const clean = removeLocaleFromPath(pathname);
  return `/${locale}${clean === '/' ? '' : clean}`;
}
