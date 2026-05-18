/**
 * Currency display utility — USD + KRW 환산 표시 (PRD §4.7 결정 19).
 *
 * 표시 규칙: `$0.50 ≈ 700원`
 * 결제 통화 결정: 사용자 IP·언어 (별도 모듈 — `lib/i18n/locale`).
 * 환율 출처: env(`USD_TO_KRW_RATE`) 또는 어드민 `/api/admin/settings/exchange-rates`.
 */

const DEFAULT_USD_TO_KRW = 1350;
const DEFAULT_USD_TO_USDC = 1; // peg

export type CurrencyCode = 'USD' | 'KRW' | 'USDC';

interface ExchangeRates {
  /** 1 USD = X KRW */
  usdToKrw: number;
  /** 1 USD = X USDC (보통 1.0) */
  usdToUsdc: number;
}

let cached: ExchangeRates | null = null;

/**
 * 환율 조회. 어드민 설정·env 우선. 미설정 시 DEFAULT.
 * 호출 측이 캐시 무효화 원하면 `clearRatesCache()`.
 */
export function getRates(): ExchangeRates {
  if (cached) return cached;
  const usdToKrw = Number(process.env.USD_TO_KRW_RATE) || DEFAULT_USD_TO_KRW;
  const usdToUsdc = Number(process.env.USD_TO_USDC_RATE) || DEFAULT_USD_TO_USDC;
  cached = { usdToKrw, usdToUsdc };
  return cached;
}

/** 캐시 무효화 — 어드민이 환율 갱신 시. */
export function clearRatesCache() {
  cached = null;
}

/**
 * 금액을 표시 문자열로. 기본 형식: 본 통화 + (≈ 다른 통화).
 *
 * @example
 *   formatDisplay(0.5, 'USD', { secondary: 'KRW' }) → "$0.50 ≈ 675원"
 *   formatDisplay(10000, 'KRW', { secondary: 'USD' }) → "10,000원 ≈ $7.41"
 *   formatDisplay(5, 'USDC')                          → "5 USDC"
 */
export function formatDisplay(
  amount: number,
  currency: CurrencyCode,
  opts: { secondary?: CurrencyCode; locale?: string } = {},
): string {
  const primary = formatPrimary(amount, currency, opts.locale);
  if (!opts.secondary || opts.secondary === currency) return primary;
  const converted = convert(amount, currency, opts.secondary);
  const secondary = formatPrimary(converted, opts.secondary, opts.locale);
  return `${primary} ≈ ${secondary}`;
}

function formatPrimary(amount: number, currency: CurrencyCode, locale?: string): string {
  switch (currency) {
    case 'USD':
      return new Intl.NumberFormat(locale ?? 'en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    case 'KRW':
      return new Intl.NumberFormat(locale ?? 'ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
      }).format(amount);
    case 'USDC':
      return `${amount.toFixed(2)} USDC`;
  }
}

/**
 * 통화 변환.
 */
export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  const { usdToKrw, usdToUsdc } = getRates();

  // 모두 USD 경유
  const inUsd = (() => {
    switch (from) {
      case 'USD':
        return amount;
      case 'KRW':
        return amount / usdToKrw;
      case 'USDC':
        return amount / usdToUsdc;
    }
  })();

  switch (to) {
    case 'USD':
      return round(inUsd, 2);
    case 'KRW':
      return round(inUsd * usdToKrw, 0);
    case 'USDC':
      return round(inUsd * usdToUsdc, 2);
  }
}

function round(n: number, digits: number): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

/**
 * 사용자 locale·통화 기준으로 표시 통화 결정 (PRD §4.7 결정 18·19).
 *   - ko-* → KRW 기본
 *   - 그 외 → USD 기본
 *   - USDC는 명시적 요청만 (자율 결제 등)
 */
export function preferredDisplayCurrency(locale?: string): CurrencyCode {
  if (locale && locale.toLowerCase().startsWith('ko')) return 'KRW';
  return 'USD';
}

/**
 * 결제 통화 결정 (PRD §4.6 결정 17):
 *   KRW → PortOne, USD → PayPal, USDC → x402.
 */
export function recommendedGateway(
  currency: CurrencyCode,
): 'PortOne' | 'PayPal' | 'x402' {
  switch (currency) {
    case 'KRW':
      return 'PortOne';
    case 'USD':
      return 'PayPal';
    case 'USDC':
      return 'x402';
  }
}
