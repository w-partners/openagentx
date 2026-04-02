'use client';

import { useState, useRef, useEffect } from 'react';
import {
  type Currency,
  type CurrencyConfig,
  CURRENCY_SYMBOLS,
  DEFAULT_CURRENCY_CONFIG,
} from '@/lib/utils/currency';
import { setCurrencyCookie } from '@/hooks/useCurrency';

function getLocaleFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments[0] ?? null;
}

export function CurrencySwitcher() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<CurrencyConfig>(DEFAULT_CURRENCY_CONFIG);
  const [current, setCurrent] = useState<Currency>('USD');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/settings/currency')
      .then((r) => (r.ok ? r.json() : { config: DEFAULT_CURRENCY_CONFIG }))
      .then((data) => {
        const cfg: CurrencyConfig = data.config ?? DEFAULT_CURRENCY_CONFIG;
        setConfig(cfg);
        // Read cookie
        const match = document.cookie.match(/CURRENCY=([^;]+)/);
        const cookieVal = match?.[1] as Currency | undefined;
        if (cookieVal && cfg.availableCurrencies.includes(cookieVal)) {
          setCurrent(cookieVal);
        } else {
          // Auto-map from locale
          const locale = getLocaleFromPath();
          const mapped = locale && cfg.languageCurrencyMap?.[locale];
          if (mapped && cfg.availableCurrencies.includes(mapped as Currency)) {
            setCurrent(mapped as Currency);
          } else {
            setCurrent(cfg.defaultCurrency);
          }
        }
      })
      .catch(() => {});
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

  function handleSelect(currency: Currency) {
    setCurrencyCookie(currency);
    setCurrent(currency);
    setOpen(false);
    window.location.reload();
  }

  // Don't render if only one currency is available
  if (config.availableCurrencies.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
        aria-label="Select currency"
      >
        <span>{CURRENCY_SYMBOLS[current]}</span>
        <span className="hidden sm:inline">{current}</span>
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
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md">
          {config.availableCurrencies.map((c) => (
            <button
              key={c}
              onClick={() => handleSelect(c)}
              className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent transition-colors ${
                c === current ? 'bg-accent font-medium' : ''
              }`}
            >
              <span>{CURRENCY_SYMBOLS[c]}</span>
              <span>{c}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
