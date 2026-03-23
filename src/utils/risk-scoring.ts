import { config } from '../config/env.js';

export type RiskGrade = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAssessment {
  score: number; // 0-100
  grade: RiskGrade;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  score: number; // 0-100
  weight: number;
  description: string;
}

function gradeFromScore(score: number): RiskGrade {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MEDIUM';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}

/** Liquidity ratio: lower liquidity/marketCap = higher risk */
export function liquidityScore(liquidityUsd: number, marketCap: number): number {
  if (marketCap <= 0) return 90;
  const ratio = liquidityUsd / marketCap;
  if (ratio >= 0.1) return 10;
  if (ratio >= 0.05) return 30;
  if (ratio >= 0.01) return 50;
  if (ratio >= 0.005) return 70;
  return 90;
}

/** Volatility: higher 24h price change = higher risk */
export function volatilityScore(priceChange24h: number): number {
  const absChange = Math.abs(priceChange24h);
  if (absChange <= 5) return 10;
  if (absChange <= 15) return 30;
  if (absChange <= 30) return 50;
  if (absChange <= 50) return 70;
  return 90;
}

/** Holder concentration: higher top holder % = higher risk */
export function holderConcentrationScore(top10HolderPercent: number): number {
  if (top10HolderPercent <= 20) return 10;
  if (top10HolderPercent <= 40) return 30;
  if (top10HolderPercent <= 60) return 50;
  if (top10HolderPercent <= 80) return 70;
  return 90;
}

/** Contract verified: unverified = higher risk */
export function contractVerifiedScore(isVerified: boolean): number {
  return isVerified ? 10 : 70;
}

/** Calculate comprehensive risk assessment */
export function calculateRisk(params: {
  liquidityUsd: number;
  marketCap: number;
  priceChange24h: number;
  top10HolderPercent?: number;
  isContractVerified?: boolean;
}): RiskAssessment {
  const factors: RiskFactor[] = [
    {
      name: 'liquidity',
      score: liquidityScore(params.liquidityUsd, params.marketCap),
      weight: config.RISK_WEIGHT_LIQUIDITY,
      description: `Liquidity/MCap ratio`,
    },
    {
      name: 'volatility',
      score: volatilityScore(params.priceChange24h),
      weight: config.RISK_WEIGHT_VOLATILITY,
      description: `24h price change: ${params.priceChange24h.toFixed(1)}%`,
    },
    {
      name: 'holder_concentration',
      score: holderConcentrationScore(params.top10HolderPercent ?? 50),
      weight: config.RISK_WEIGHT_HOLDER_CONCENTRATION,
      description: `Top 10 holders: ${(params.top10HolderPercent ?? 50).toFixed(0)}%`,
    },
    {
      name: 'contract_verified',
      score: contractVerifiedScore(params.isContractVerified ?? false),
      weight: config.RISK_WEIGHT_CONTRACT_VERIFIED,
      description: params.isContractVerified ? 'Contract verified' : 'Contract unverified',
    },
  ];

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const score = Math.round(totalWeight > 0 ? weightedScore / totalWeight : 50);

  return {
    score,
    grade: gradeFromScore(score),
    factors,
  };
}
