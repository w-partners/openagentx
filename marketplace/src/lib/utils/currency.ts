export type Currency = 'USDC' | 'USD' | 'KRW' | 'EUR' | 'JPY';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USDC: 'USDC',
  USD: '$',
  KRW: '₩',
  EUR: '€',
  JPY: '¥',
};

export const ALL_CURRENCIES: Currency[] = ['USDC', 'USD', 'KRW', 'EUR', 'JPY'];

export interface CurrencyConfig {
  availableCurrencies: Currency[];
  defaultCurrency: Currency;
  autoRefreshInterval: number; // seconds
  /** Global exchange markup percentage (default 10%) */
  globalMarkupPercent: number;
  /** Per-currency override markup (optional, overrides global) */
  currencyMarkupPercent: Record<string, number>;
  languageCurrencyMap: Record<string, string>;
  showOriginalPrice: boolean;
}

export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  availableCurrencies: ['USD'],
  defaultCurrency: 'USD',
  autoRefreshInterval: 3600,
  globalMarkupPercent: 10,
  currencyMarkupPercent: {},
  languageCurrencyMap: {
    en: 'USD',
    ko: 'KRW',
    ja: 'JPY',
    zh: 'USD',
    es: 'EUR',
    fr: 'EUR',
  },
  showOriginalPrice: true,
};

/** Get markup percent for a currency (per-currency override or global) */
export function getMarkupPercent(currency: Currency, config: CurrencyConfig): number {
  return config.currencyMarkupPercent[currency] ?? config.globalMarkupPercent;
}

export function formatPrice(
  usdcAmount: number,
  currency: Currency,
  rates: Record<string, number>,
  config?: CurrencyConfig,
): string {
  if (currency === 'USDC' || currency === 'USD') return `$${usdcAmount}`;
  const rate = rates[currency] ?? 1;
  const converted = usdcAmount * rate;
  const markupPct = config ? getMarkupPercent(currency, config) : 0;
  const final = converted * (1 + markupPct / 100);
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted =
    currency === 'KRW' || currency === 'JPY'
      ? `${symbol}${Math.round(final).toLocaleString()}`
      : `${symbol}${final.toFixed(2)}`;
  if (config?.showOriginalPrice) return `${formatted} ($${usdcAmount})`;
  return formatted;
}
