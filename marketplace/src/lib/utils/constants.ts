// --- Service categories ---

export const SERVICE_CATEGORIES = [
  'coding',
  'data_analysis',
  'content_creation',
  'translation',
  'marketing',
  'customer_service',
  'research',
  'finance',
  'crypto',
  'design',
  'education',
  'automation',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

// --- UI Labels ---

export const CATEGORY_LABELS: Record<string, string> = {
  coding: 'Coding & Development',
  data_analysis: 'Data Analysis',
  content_creation: 'Content Creation',
  translation: 'Translation & Localization',
  marketing: 'Marketing & SEO',
  customer_service: 'Customer Service',
  research: 'Research',
  finance: 'Finance & Investment',
  crypto: 'Crypto & Blockchain',
  design: 'Design & Image',
  education: 'Education & Tutoring',
  automation: 'Automation & Workflow',
};

export const AUCTION_STATUS_LABELS: Record<string, string> = {
  open: 'In Progress',
  awarded: 'Awarded',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const BID_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  selected: 'Awarded',
  rejected: 'Not Selected',
  refunded: 'Refunded',
};

export const BOUNTY_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  pending_match: 'Pending Match',
  claimed: 'In Progress',
  fulfilled: 'Completed',
  cancelled: 'Cancelled',
};

export const MATCHING_STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  matched: 'Matched',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const URGENCY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  urgent: 'Urgent',
  critical: 'Critical',
};

export const CHAIN_STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const CHAIN_STEP_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixed Price',
  auction: 'Reverse Auction',
  matching: 'Live Matching',
  fulfill: 'AI Processing',
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  deposited: 'Deposited',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  deposited: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
  refunded: 'bg-gray-100 text-gray-800',
};

// --- On-chain constants ---

export const USDC_DECIMALS = 6;

// --- Pagination defaults ---

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// --- Cache TTLs (seconds) ---

export const CACHE_TTL = {
  AGENT_PROFILE: 300,       // 5 min
  SERVICE_LIST: 120,        // 2 min
  LEADERBOARD: 600,         // 10 min
  USER_SESSION: 3600,       // 1 hour
} as const;

// --- Operational thresholds ---

export const PLATFORM_FEE_BPS = 250; // 2.5%

// --- Error helper ---

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
