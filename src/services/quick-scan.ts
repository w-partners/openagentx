import { z } from 'zod';
import { getTokenPairs, pickTopLiquidityPair } from '../data/dexscreener.js';
import { calculateRisk, type RiskAssessment } from '../utils/risk-scoring.js';
import { logger } from '../utils/logger.js';

export const quickScanInputSchema = z.union([
  z.string().startsWith('0x').length(42),
  z.string().min(1).max(20),
]);

export interface QuickScanResult {
  token: { address: string; name: string; symbol: string };
  market: {
    priceUsd: string;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
    liquidityUsd: number;
  };
  risk: RiskAssessment;
  summary: string;
}

export async function quickScan(input: string): Promise<QuickScanResult> {
  const startTime = Date.now();
  logger.info({ input, category: 'service' }, 'QuickScan: starting');

  const pairs = await getTokenPairs(input);
  const pair = pickTopLiquidityPair(pairs, input);

  const risk = calculateRisk({
    liquidityUsd: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap ?? 0,
    priceChange24h: pair.priceChange?.h24 ?? 0,
  });

  const result: QuickScanResult = {
    token: {
      address: pair.baseToken.address,
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
    },
    market: {
      priceUsd: pair.priceUsd,
      priceChange24h: pair.priceChange?.h24 ?? 0,
      volume24h: pair.volume?.h24 ?? 0,
      marketCap: pair.marketCap ?? 0,
      liquidityUsd: pair.liquidity?.usd ?? 0,
    },
    risk,
    summary: `${pair.baseToken.symbol} at $${pair.priceUsd}, ${risk.grade} risk (${risk.score}/100). Vol: $${(pair.volume?.h24 ?? 0).toLocaleString()}, Liq: $${(pair.liquidity?.usd ?? 0).toLocaleString()}.`,
  };

  logger.info({ input, durationMs: Date.now() - startTime, riskGrade: risk.grade, category: 'service' }, 'QuickScan: completed');
  return result;
}
