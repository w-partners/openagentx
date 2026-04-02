'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type Currency,
  type CurrencyConfig,
  DEFAULT_CURRENCY_CONFIG,
  formatPrice,
} from '@/lib/utils/currency';

const CURRENCY_COOKIE = 'CURRENCY';

function getCurrencyFromCookie(): Currency | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`${CURRENCY_COOKIE}=([^;]+)`));
  return (match?.[1] as Currency) ?? null;
}

function getLocaleFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments[0] ?? null;
}

export function setCurrencyCookie(currency: Currency): void {
  document.cookie = `${CURRENCY_COOKIE}=${currency};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

let cachedConfig: CurrencyConfig | null = null;
let cachedRates: Record<string, number> | null = null;
let fetchPromise: Promise<{ config: CurrencyConfig; rates: Record<string, number> }> | null = null;

async function fetchCurrencyData(): Promise<{ config: CurrencyConfig; rates: Record<string, number> }> {
  if (cachedConfig && cachedRates) return { config: cachedConfig, rates: cachedRates };
  if (fetchPromise) return fetchPromise;

  fetchPromise = Promise.all([
    fetch('/api/admin/settings/currency').then(r => r.ok ? r.json() : { config: DEFAULT_CURRENCY_CONFIG }),
    fetch('/api/admin/settings/exchange-rates').then(r => r.ok ? r.json() : { rates: {} }),
  ]).then(([cfgData, rateData]) => {
    const config = cfgData.config ?? DEFAULT_CURRENCY_CONFIG;
    const rates = rateData.rates ?? {};
    cachedConfig = config;
    cachedRates = rates;
    return { config, rates };
  }).catch(() => ({ config: DEFAULT_CURRENCY_CONFIG, rates: {} as Record<string, number> }));

  return fetchPromise;
}

export function useCurrency() {
  const [config, setConfig] = useState<CurrencyConfig>(DEFAULT_CURRENCY_CONFIG);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [currency, setCurrency] = useState<Currency>('USDC');

  useEffect(() => {
    fetchCurrencyData().then(({ config: cfg, rates: r }) => {
      setConfig(cfg);
      setRates(r);
      const cookieVal = getCurrencyFromCookie();
      if (cookieVal && cfg.availableCurrencies.includes(cookieVal)) {
        setCurrency(cookieVal);
      } else {
        const locale = getLocaleFromPath();
        const mapped = locale && cfg.languageCurrencyMap?.[locale];
        if (mapped && cfg.availableCurrencies.includes(mapped as Currency)) {
          setCurrency(mapped as Currency);
        } else {
          setCurrency(cfg.defaultCurrency);
        }
      }
    });
  }, []);

  const format = useCallback(
    (usdcAmount: number) => {
      return formatPrice(usdcAmount, currency, rates, config);
    },
    [currency, rates, config],
  );

  return { currency, config, rates, format, setCurrency };
}
