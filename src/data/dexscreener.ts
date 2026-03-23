import { createHttpClient } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { getOrFetch } from '../cache/redis.js';

const BASE_URL = 'https://api.dexscreener.com';
const CACHE_TTL = 30; // 30 seconds

export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string;
  priceUsd: string;
  txns: { h24: { buys: number; sells: number } };
  volume: { h24: number };
  liquidity: { usd: number };
  fdv: number;
  marketCap: number;
  priceChange: { h1: number; h24: number; h6: number };
}

/** Pick the highest-liquidity pair, throw if none found */
export function pickTopLiquidityPair(pairs: DexPair[], label: string): DexPair {
  if (pairs.length === 0) {
    throw new Error(`No trading pairs found for: ${label}`);
  }
  return pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
}

export interface DexSearchResult {
  pairs: DexPair[];
}

const http = createHttpClient(BASE_URL, { timeout: 5_000 });

export async function searchTokens(q: string): Promise<DexPair[]> {
  const key = `ci:dex:search:${q.toLowerCase()}`;
  return getOrFetch<DexPair[]>(key, CACHE_TTL, async () => {
    logger.debug({ query: q }, 'DexScreener: searching tokens');
    const { data } = await http.get<DexSearchResult>('/latest/dex/search', {
      params: { q },
    });
    return data.pairs || [];
  });
}

export async function getTokenPairs(tokenAddress: string): Promise<DexPair[]> {
  const key = `ci:dex:pairs:${tokenAddress.toLowerCase()}`;
  return getOrFetch<DexPair[]>(key, CACHE_TTL, async () => {
    logger.debug({ tokenAddress }, 'DexScreener: fetching token pairs');
    const { data } = await http.get<DexSearchResult>(`/tokens/v1/base/${tokenAddress}`);
    return data.pairs || [];
  });
}

export async function getPairByAddress(pairAddress: string): Promise<DexPair | null> {
  const key = `ci:dex:pair:${pairAddress.toLowerCase()}`;
  return getOrFetch<DexPair | null>(key, CACHE_TTL, async () => {
    logger.debug({ pairAddress }, 'DexScreener: fetching pair');
    const { data } = await http.get<DexSearchResult>(`/latest/dex/pairs/base/${pairAddress}`);
    return data.pairs?.[0] || null;
  });
}

export async function getTrendingTokens(): Promise<DexPair[]> {
  return getOrFetch<DexPair[]>('ci:dex:trending', CACHE_TTL, async () => {
    logger.debug('DexScreener: fetching trending');
    const { data } = await http.get('/token-boosts/top/v1');
    return Array.isArray(data) ? data : [];
  });
}
