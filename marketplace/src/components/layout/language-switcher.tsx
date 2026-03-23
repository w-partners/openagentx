'use client';

import { useState, useRef, useEffect } from 'react';
import {
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  LOCALE_FLAGS,
  getClientLocale,
  setClientLocale,
  type Locale,
} from '@/i18n/client';

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>('en');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLocale(getClientLocale());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(locale: Locale) {
    setClientLocale(locale);
    setCurrentLocale(locale);
    setOpen(false);

    // Navigate to the locale-prefixed version of current path
    const currentPath = window.location.pathname;
    // Remove existing locale prefix if any
    const segments = currentPath.split('/').filter(Boolean);
    const firstSeg = segments[0];
    const isLocalePrefixed = SUPPORTED_LOCALES.includes(firstSeg as Locale);
    const pathWithoutLocale = isLocalePrefixed
      ? '/' + segments.slice(1).join('/')
      : currentPath;
    const newPath = `/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
    window.location.href = newPath + window.location.search;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
        aria-label="Select language"
      >
        <span>{LOCALE_FLAGS[currentLocale]}</span>
        <span className="hidden sm:inline">{LOCALE_NAMES[currentLocale]}</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale}
              onClick={() => handleSelect(locale)}
              className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent transition-colors ${
                locale === currentLocale ? 'bg-accent font-medium' : ''
              }`}
            >
              <span>{LOCALE_FLAGS[locale]}</span>
              <span>{LOCALE_NAMES[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
