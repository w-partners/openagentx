import { NextResponse } from 'next/server';

let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd,krw,eur,jpy';

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  KRW: 1380,
  EUR: 0.92,
  JPY: 150,
};

async function fetchAutoRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < 3600 * 1000) {
    return cachedRates;
  }

  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json();
    const usdCoin = data['usd-coin'];
    if (!usdCoin) throw new Error('No usd-coin data');

    const rates: Record<string, number> = {
      USD: usdCoin.usd ?? 1,
      KRW: usdCoin.krw ?? 1380,
      EUR: usdCoin.eur ?? 0.92,
      JPY: usdCoin.jpy ?? 150,
    };

    cachedRates = rates;
    cacheTimestamp = now;
    return rates;
  } catch {
    return cachedRates ?? FALLBACK_RATES;
  }
}

/**
 * GET /api/admin/settings/exchange-rates
 * Returns current exchange rates from CoinGecko (auto).
 */
export async function GET() {
  try {
    const rates = await fetchAutoRates();
    return NextResponse.json({ source: 'auto', rates });
  } catch {
    return NextResponse.json({ source: 'fallback', rates: FALLBACK_RATES });
  }
}
