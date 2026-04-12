'use client';

import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_NAMES,
  LOCALE_FLAGS,
  isLocale,
  getTranslations,
  type Locale,
  type Dictionary,
} from './config';
import { useIsAdminLocale } from '@/components/admin-locale-provider';

/** Client-side: get current locale from cookie */
export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  if (value && isLocale(value)) return value;
  return DEFAULT_LOCALE;
}

/** Client-side: set locale cookie */
export function setClientLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

/** Get a nested value from dictionary using dot notation key */
export function t(dict: Dictionary, key: string): string {
  const parts = key.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}

/** Client-side: detect locale from URL path first, then cookie */
export function detectClientLocale(): Locale {
  if (typeof window !== 'undefined') {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const first = segments[0];
    if (first && isLocale(first)) return first;
  }
  return getClientLocale();
}

/** React hook: get dictionary for current locale (admin always gets Korean) */
export function useDict(): Dictionary {
  const isAdmin = useIsAdminLocale();
  if (isAdmin) return getTranslations('ko');
  const locale = detectClientLocale();
  return getTranslations(locale);
}

/** React hook: always return Korean dictionary (for admin pages) */
export function useAdminDict(): Dictionary {
  return getTranslations('ko');
}

export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_NAMES,
  LOCALE_FLAGS,
  isLocale,
  getTranslations,
};
export type { Locale, Dictionary };
