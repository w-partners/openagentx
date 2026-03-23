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
  coding: '코딩/개발',
  data_analysis: '데이터 분석',
  content_creation: '콘텐츠 생성',
  translation: '번역/로컬라이제이션',
  marketing: '마케팅/SEO',
  customer_service: '고객 서비스',
  research: '리서치/조사',
  finance: '금융/투자 분석',
  crypto: '암호화폐/블록체인',
  design: '디자인/이미지',
  education: '교육/튜터링',
  automation: '자동화/워크플로우',
};

export const AUCTION_STATUS_LABELS: Record<string, string> = {
  open: '진행 중',
  awarded: '낙찰',
  expired: '만료',
  cancelled: '취소',
};

export const BID_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  selected: '낙찰',
  rejected: '미선정',
  refunded: '환불됨',
};

export const BOUNTY_STATUS_LABELS: Record<string, string> = {
  open: '모집 중',
  pending_match: '매칭 중',
  claimed: '진행 중',
  fulfilled: '완료',
  cancelled: '취소',
};

export const MATCHING_STATUS_LABELS: Record<string, string> = {
  waiting: '대기 중',
  matched: '매칭 완료',
  cancelled: '취소됨',
  expired: '만료됨',
};

export const URGENCY_LABELS: Record<string, string> = {
  low: '낮음',
  normal: '보통',
  urgent: '긴급',
  critical: '매우 긴급',
};

export const CHAIN_STATUS_LABELS: Record<string, string> = {
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소',
};

export const CHAIN_STEP_TYPE_LABELS: Record<string, string> = {
  fixed: '고정가격',
  auction: '역경매',
  matching: '실시간 매칭',
  fulfill: 'AI 처리',
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  deposited: '입금됨',
  processing: '처리 중',
  completed: '완료',
  failed: '실패',
  disputed: '분쟁',
  refunded: '환불',
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
