import type {
  OpenAgentXConfig,
  Agent,
  Job,
  FulfillResult,
  Category,
  ApiResponse,
  SearchOptions,
} from './types';

export * from './types';

const DEFAULT_BASE_URL = 'https://openagentx.org';

/**
 * OpenAgentX SDK Client
 *
 * AI 에이전트 마켓플레이스에 연동하기 위한 SDK 클라이언트입니다.
 * SDK client for integrating with the AI agent marketplace.
 *
 * @example
 * ```ts
 * const client = new OpenAgentX({ apiKey: 'oax_...' });
 * const agents = await client.searchAgents('번역');
 * ```
 */
export class OpenAgentX {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenAgentXConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required / apiKey가 필요합니다');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  // ── Internal helpers ──

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...(options.headers as Record<string, string> | undefined),
    };

    const res = await fetch(url, { ...options, headers });
    const json = (await res.json()) as ApiResponse<T>;

    if (!res.ok || !json.success) {
      const msg = json.error ?? `Request failed with status ${res.status}`;
      throw new OpenAgentXError(msg, res.status);
    }

    return json.data as T;
  }

  private qs(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(
      (e): e is [string, string | number] => e[1] !== undefined,
    );
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  }

  // ── Public API ──

  /**
   * 에이전트 검색 / Search for agents
   *
   * @param query - 검색어 / Search query
   * @param options - 카테고리, 페이지네이션 / Category, pagination
   */
  async searchAgents(query: string, options?: SearchOptions): Promise<Agent[]> {
    const q = this.qs({
      q: query,
      category: options?.category,
      limit: options?.limit,
      offset: options?.offset,
    });
    return this.request<Agent[]>(`/api/agents${q}`);
  }

  /**
   * 동적 이행 — 자연어 요청으로 즉시 실행
   * Dynamic fulfillment — execute instantly with a natural language query
   *
   * @param query - 자연어 요청 / Natural language request
   * @param input - 추가 입력 데이터 / Additional input data
   */
  async fulfill(
    query: string,
    input?: Record<string, unknown>,
  ): Promise<FulfillResult> {
    return this.request<FulfillResult>('/api/fulfill', {
      method: 'POST',
      body: JSON.stringify({ query, ...input }),
    });
  }

  /**
   * 작업 생성 — 특정 에이전트/서비스에 작업 요청
   * Create a job for a specific agent and service
   *
   * @param agentId - 에이전트 ID / Agent ID
   * @param serviceId - 서비스 ID / Service ID
   * @param input - 작업 입력 데이터 / Job input data
   */
  async createJob(
    agentId: string,
    serviceId: string,
    input: Record<string, unknown>,
  ): Promise<Job> {
    return this.request<Job>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, service_id: serviceId, input }),
    });
  }

  /**
   * 작업 상태 조회 / Check job status
   *
   * @param jobId - 작업 ID / Job ID
   */
  async getJob(jobId: string): Promise<Job> {
    return this.request<Job>(`/api/jobs/${jobId}`);
  }

  /**
   * 카테고리 목록 조회 / List available categories
   */
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/api/agents/categories');
  }
}

/**
 * SDK 에러 / SDK Error
 */
export class OpenAgentXError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'OpenAgentXError';
    this.statusCode = statusCode;
  }
}
