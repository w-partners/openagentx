import { createHttpClient } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';
import { getOrFetch } from '../cache/redis.js';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 300; // 5 minutes

export interface CoinPrice {
  [coinId: string]: {
    usd: number;
    usd_market_cap: number;
    usd_24h_vol: number;
    usd_24h_change: number;
  };
}

export interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    price_btc: number;
  };
}

export interface GlobalMarketData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_percentage: { btc: number; eth: number };
    market_cap_change_percentage_24h_usd: number;
  };
}

const http = createHttpClient(BASE_URL, {
  timeout: 10_000,
  headers: config.COINGECKO_API_KEY
    ? { 'x-cg-pro-api-key': config.COINGECKO_API_KEY }
    : {},
});

export async function getPrice(coinIds: string[]): Promise<CoinPrice> {
  const key = `ci:cg:price:${coinIds.sort().join(',')}`;
  return getOrFetch<CoinPrice>(key, CACHE_TTL, async () => {
    logger.debug({ coinIds }, 'CoinGecko: fetching prices');
    const { data } = await http.get<CoinPrice>('/simple/price', {
      params: {
        ids: coinIds.join(','),
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true,
      },
    });
    return data;
  });
}

export async function getTrending(): Promise<TrendingCoin[]> {
  return getOrFetch<TrendingCoin[]>('ci:cg:trending', CACHE_TTL, async () => {
    logger.debug('CoinGecko: fetching trending');
    const { data } = await http.get<{ coins: TrendingCoin[] }>('/search/trending');
    return data.coins || [];
  });
}

export async function getGlobalMarket(): Promise<GlobalMarketData> {
  return getOrFetch<GlobalMarketData>('ci:cg:global', CACHE_TTL, async () => {
    logger.debug('CoinGecko: fetching global market');
    const { data } = await http.get<GlobalMarketData>('/global');
    return data;
  });
}
