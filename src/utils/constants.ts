// --- ERC20 ABI (single source of truth) ---
export const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
];

// USDC on Base chain
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const USDC_DECIMALS = 6;

// --- Service names ---
export const SERVICE_NAMES = {
  QUICK_SCAN: 'crypto_quick_scan',
  TX_PREFLIGHT: 'tx_preflight_summary',
  DEEP_DIVE: 'crypto_deep_dive',
  AGENT_DISCOVERY: 'agent_discovery',
  MARKETPLACE_CONCIERGE: 'marketplace_concierge',
} as const;

export type ServiceName = (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES];

// --- Job/Transaction status ---
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
export type TxStatus = 'pending' | 'confirmed' | 'failed';

// --- Operational thresholds ---
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_WARN_THRESHOLD = 3;
export const HEARTBEAT_ALERT_THRESHOLD = 5;
export const SHUTDOWN_GRACE_MS = 2_000;
export const ETH_LOW_BALANCE = 0.001;
export const USDC_LOW_BALANCE = 1;
export const TELEGRAM_QUEUE_MAX = 500;
export const LOG_BUFFER_MAX = 10_000;
export const GAS_BUFFER_PERCENT = 120n;

// --- Known contracts on Base ---
export const KNOWN_CONTRACTS: Record<string, string> = {
  '0x2626664c2603336e57b271c5c0b26f421741e481': 'Uniswap V3 Router',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router',
};

// --- Error helper ---
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
