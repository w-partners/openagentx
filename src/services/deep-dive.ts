import { z } from 'zod';
import { getTokenPairs, pickTopLiquidityPair } from '../data/dexscreener.js';
import { getTokenInfo, getTokenBalance, type TokenInfo } from '../data/base-rpc.js';
import { calculateRisk, type RiskAssessment } from '../utils/risk-scoring.js';
import { getAddress } from '../wallet/manager.js';
import { logger } from '../utils/logger.js';

export const deepDiveInputSchema = z.string().startsWith('0x').length(42);

export interface DeepDiveResult {
  token: TokenInfo & { address: string };
  market: {
    priceUsd: string;
    priceChange: { h1: number; h24: number; h6: number };
    volume24h: number;
    marketCap: number;
    fdv: number;
    liquidityUsd: number;
    txns24h: { buys: number; sells: number };
  };
  onchain: { agentBalance: string; topPairAddress: string; dexId: string };
  risk: RiskAssessment;
  summary: string;
}

export async function deepDive(tokenAddress: string): Promise<DeepDiveResult> {
  const startTime = Date.now();
  logger.info({ tokenAddress, category: 'service' }, 'DeepDive: starting');

  const [dexResult, tokenInfoResult, balanceResult] = await Promise.allSettled([
    getTokenPairs(tokenAddress),
    getTokenInfo(tokenAddress),
    getTokenBalance(tokenAddress, getAddress()),
  ]);

  const pairs = dexResult.status === 'fulfilled' ? dexResult.value : [];
  const pair = pickTopLiquidityPair(pairs, tokenAddress);

  const tokenInfo: TokenInfo =
    tokenInfoResult.status === 'fulfilled'
      ? tokenInfoResult.value
      : { name: pair.baseToken.name, symbol: pair.baseToken.symbol, decimals: 18, totalSupply: 'unknown' };

  const agentBalance = balanceResult.status === 'fulfilled' ? balanceResult.value : '0';

  const risk = calculateRisk({
    liquidityUsd: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap ?? 0,
    priceChange24h: pair.priceChange?.h24 ?? 0,
  });

  const result: DeepDiveResult = {
    token: { address: tokenAddress, ...tokenInfo },
    market: {
      priceUsd: pair.priceUsd,
      priceChange: pair.priceChange ?? { h1: 0, h24: 0, h6: 0 },
      volume24h: pair.volume?.h24 ?? 0,
      marketCap: pair.marketCap ?? 0,
      fdv: pair.fdv ?? 0,
      liquidityUsd: pair.liquidity?.usd ?? 0,
      txns24h: pair.txns?.h24 ?? { buys: 0, sells: 0 },
    },
    onchain: { agentBalance, topPairAddress: pair.pairAddress, dexId: pair.dexId },
    risk,
    summary: [
      `${tokenInfo.symbol} (${tokenInfo.name}) — Deep Dive`,
      `Price: $${pair.priceUsd} | MCap: $${(pair.marketCap ?? 0).toLocaleString()}`,
      `24h Vol: $${(pair.volume?.h24 ?? 0).toLocaleString()} | Liq: $${(pair.liquidity?.usd ?? 0).toLocaleString()}`,
      `Risk: ${risk.grade} (${risk.score}/100)`,
    ].join('\n'),
  };

  logger.info({ tokenAddress, durationMs: Date.now() - startTime, riskGrade: risk.grade, category: 'service' }, 'DeepDive: completed');
  return result;
}
