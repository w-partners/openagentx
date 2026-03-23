import { z } from 'zod';
import { getTransaction, estimateGas, getGasPrice } from '../data/base-rpc.js';
import { logger } from '../utils/logger.js';
import { KNOWN_CONTRACTS } from '../utils/constants.js';

export const txPreflightInputSchema = z.union([
  z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  z.object({
    to: z.string().startsWith('0x').length(42),
    value: z.string().optional(),
    data: z.string().optional(),
  }),
]);

type TxInput = z.infer<typeof txPreflightInputSchema>;
export type Recommendation = 'SAFE' | 'CAUTION' | 'DANGER';

export interface TxPreflightResult {
  type: 'hash' | 'pending';
  transaction: { to: string; value: string; from?: string };
  analysis: {
    estimatedGas: string;
    gasPriceGwei: string;
    riskFlags: string[];
    recommendation: Recommendation;
    summary: string;
  };
}

function detectRiskFlags(to: string, value: string, data?: string): string[] {
  const flags: string[] = [];
  const ethValue = parseFloat(value);

  if (ethValue > 1) flags.push('HIGH_VALUE_TRANSFER');
  if (!KNOWN_CONTRACTS[to.toLowerCase()]) flags.push('UNKNOWN_CONTRACT');
  if (
    data &&
    data.startsWith('0x095ea7b3') &&
    data.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  ) {
    flags.push('UNLIMITED_APPROVAL');
  }
  if ((!data || data === '0x') && ethValue > 0) flags.push('PLAIN_ETH_TRANSFER');

  return flags;
}

function recommend(flags: string[]): Recommendation {
  // DANGER conditions first (before length check)
  if (flags.includes('UNLIMITED_APPROVAL')) return 'DANGER';
  if (flags.includes('UNKNOWN_CONTRACT') && flags.includes('HIGH_VALUE_TRANSFER')) return 'DANGER';
  if (flags.length >= 2) return 'CAUTION';
  if (flags.length > 0) return 'CAUTION';
  return 'SAFE';
}

export async function txPreflight(input: TxInput): Promise<TxPreflightResult> {
  const startTime = Date.now();
  const isHash = typeof input === 'string';
  logger.info({ inputType: isHash ? 'hash' : 'pending', category: 'service' }, 'TxPreflight: starting');

  let to: string;
  let value: string;
  let from: string | undefined;
  let data: string | undefined;

  if (isHash) {
    const txInfo = await getTransaction(input);
    if (!txInfo) throw new Error(`Transaction not found: ${input}`);
    to = txInfo.to ?? '0x0';
    value = txInfo.value;
    from = txInfo.from;
  } else {
    to = input.to;
    value = input.value ?? '0';
    data = input.data;
  }

  const [gasEstimate, gasPrice] = await Promise.all([
    !isHash ? estimateGas({ to, value: BigInt(0), data }).catch(() => 0n) : Promise.resolve(0n),
    getGasPrice().catch(() => 'unknown'),
  ]);

  const riskFlags = detectRiskFlags(to, value, data);
  const recommendation = recommend(riskFlags);
  const knownName = KNOWN_CONTRACTS[to.toLowerCase()];

  const summary = knownName
    ? `Transaction to ${knownName}. ${recommendation === 'SAFE' ? 'Appears safe.' : `${riskFlags.length} risk flag(s).`}`
    : `Transaction to unknown contract. ${riskFlags.join(', ') || 'No specific risks.'}`;

  logger.info({ durationMs: Date.now() - startTime, recommendation, category: 'service' }, 'TxPreflight: completed');

  return {
    type: isHash ? 'hash' : 'pending',
    transaction: { to, value, from },
    analysis: { estimatedGas: gasEstimate.toString(), gasPriceGwei: String(gasPrice), riskFlags, recommendation, summary },
  };
}
