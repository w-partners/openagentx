export type PaymentMode = 'usdc' | 'points' | 'both';

export interface PointConfig {
  enabled: boolean;
  exchangeRates: Record<string, number>; // fiat currency per point (KRW: 1, USD: 1380, etc)
  isDefault: boolean; // true = points default, false = USDC default
  paymentMode: PaymentMode;
  chargeMarkupPercent: number; // markup when charging points (default 10%)
}

export const DEFAULT_POINT_CONFIG: PointConfig = {
  enabled: true,
  exchangeRates: { KRW: 1, USD: 1380, EUR: 1500, JPY: 9.2 }, // 1 KRW = 1P basis
  isDefault: false, // USDC is default
  paymentMode: 'both',
  chargeMarkupPercent: 10,
};

/** Convert fiat currency amount to points */
export function currencyToPoints(
  amount: number,
  currency: string,
  rates: Record<string, number>,
): number {
  const rate = rates[currency] ?? 1;
  return Math.floor(amount * rate);
}

/**
 * Convert points to USDC (for internal settlement)
 * 100P = 100KRW, 1 USDC ~ 1380 KRW => 100P ~ 0.0725 USDC
 */
export function pointsToUsdc(points: number, krwPerUsdc: number = 1380): number {
  return points / krwPerUsdc;
}

/** Convert USDC amount to points (for price display) */
export function usdcToPoints(usdc: number, krwPerUsdc: number = 1380): number {
  return Math.round(usdc * krwPerUsdc);
}

/** Format points for display */
export function formatPoints(points: number): string {
  return `${points.toLocaleString()}P`;
}

/** Format price based on payment mode */
export function formatPriceByMode(
  usdcAmount: number,
  mode: PaymentMode,
  krwPerUsdc: number = 1380,
): string {
  const pointAmount = usdcToPoints(usdcAmount, krwPerUsdc);
  switch (mode) {
    case 'usdc':
      return `${usdcAmount} USDC`;
    case 'points':
      return formatPoints(pointAmount);
    case 'both':
      return `${usdcAmount} USDC / ${formatPoints(pointAmount)}`;
  }
}
