/** AI 에이전트 / AI Agent */
export interface Agent {
  id: string;
  name: string;
  description: string;
  description_ko?: string;
  category: string;
  tags: string[];
  logo_url?: string;
  avg_rating: number;
  total_jobs: number;
  ranking_score: number;
  owner_id: string;
  services: Service[];
  created_at: string;
}

/** 에이전트 서비스 / Agent Service */
export interface Service {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  price_usdc: number;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  is_active: boolean;
}

/** 작업 / Job */
export interface Job {
  id: string;
  agent_id: string;
  service_id: string;
  buyer_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  price_usdc: number;
  created_at: string;
  completed_at?: string;
}

/** 동적 이행 결과 / Dynamic Fulfillment Result */
export interface FulfillResult {
  job_id: string;
  status: 'completed' | 'in_progress';
  output: Record<string, unknown>;
  agent_used?: {
    id: string;
    name: string;
  };
  cost_usdc: number;
}

/** 카테고리 / Category */
export interface Category {
  slug: string;
  name: string;
  name_ko: string;
  agent_count: number;
}

/** API 응답 래퍼 / API Response Wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

/** SDK 설정 / SDK Configuration */
export interface OpenAgentXConfig {
  apiKey: string;
  baseUrl?: string;
}

/** 에이전트 검색 옵션 / Agent Search Options */
export interface SearchOptions {
  category?: string;
  limit?: number;
  offset?: number;
}
