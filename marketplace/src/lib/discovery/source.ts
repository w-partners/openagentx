/**
 * Discovery source 조립 — DB + 환경에서 정본 데이터를 모음.
 *
 * 본 모듈을 갱신하면 3개 표면(agent.json, ucp, mcp)이 동시에 갱신된다.
 */

import type { DiscoverySource } from './types';

/**
 * 마켓 베이스 URL — 환경에서 결정.
 * (Beta는 `https://openagentx.org` 고정 — 추후 env로)
 */
function marketUrl(): string {
  return process.env.NEXT_PUBLIC_MARKET_URL ?? 'https://openagentx.org';
}

/**
 * 마켓 표면 메타 (정적 부분).
 */
function market() {
  const url = marketUrl();
  return {
    name: 'OpenAgentX 마켓플레이스',
    description:
      '범용 AI 에이전트 마켓플레이스. 코딩, 데이터 분석, 콘텐츠 생성, 번역, 마케팅, 금융, 암호화폐 등 모든 분야의 AI 에이전트 서비스. 4종 거래 모델(fixed/auction/matching/chain) 지원.',
    url,
    version: '3.0.0', // PRD-OpenAgentX v3.0
    provider: {
      organization: 'OpenAgentX',
      url,
      contactEmail: 'contact@openagentx.org',
    },
    capabilities: {
      streaming: true,
      sse: true,
      pushNotifications: false,
    },
    authentication: {
      type: 'bearer' as const,
      description: 'JWT Bearer token via /api/auth',
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    payment: {
      methods: ['PortOne', 'PayPal', 'x402'] as Array<
        'PortOne' | 'PayPal' | 'x402' | 'PayApp' | 'Stripe'
      >,
      chain: 'base' as const,
    },
    currencies: ['USD', 'KRW', 'USDC'] as Array<'USD' | 'KRW' | 'USDC'>,
    locale: 'ko-KR',
  };
}

/**
 * 스킬 정의 — 4종 거래 모델 + 검색·조회·정산.
 *
 * 향후 agent_capabilities DB 테이블에서 메이커가 등록한 도구를 추가.
 * 현재는 마켓 자체가 노출하는 표준 스킬만.
 */
function coreSkills() {
  const base = marketUrl();
  return [
    {
      id: 'agent-search',
      name: '에이전트 검색',
      description:
        'AI 에이전트를 키워드·카테고리·태그·평점·가격으로 검색합니다. 한국어/영어 의미 검색 지원.',
      endpoint: `${base}/api/agents`,
      method: 'GET' as const,
      tags: ['discovery', 'search'],
      examples: [
        { input: '?q=coding', description: '코딩 관련 에이전트 검색' },
        { input: '?q=번역&locale=ko', description: '번역 에이전트 검색' },
      ],
    },
    {
      id: 'agent-detail',
      name: '에이전트 상세',
      description: '개별 에이전트의 메타·가격·평점·예시·도구를 조회합니다.',
      endpoint: `${base}/api/agents/{id}`,
      method: 'GET' as const,
      tags: ['discovery'],
    },
    {
      id: 'job-create',
      name: '서비스 실행 (고정가)',
      description: 'fixed 거래 모델 — 즉시 결제 후 에이전트가 작업 수행. 결과 SSE 또는 webhook.',
      endpoint: `${base}/api/jobs`,
      method: 'POST' as const,
      inputModes: ['application/json'],
      outputModes: ['application/json', 'text/event-stream'],
      tags: ['trading', 'fixed'],
      paramsSchema: {
        type: 'object',
        required: ['agent_id', 'inputs'],
        properties: {
          agent_id: { type: 'string' },
          inputs: { type: 'object' },
          callback_url: { type: 'string', format: 'uri' },
        },
      },
    },
    {
      id: 'bounty-create',
      name: '바운티 생성 (matching)',
      description:
        'matching 거래 모델 — 작업 요건 게시 → 시스템이 자동으로 후보 에이전트 3개 매칭 → 사용자 선택.',
      endpoint: `${base}/api/bounties`,
      method: 'POST' as const,
      tags: ['trading', 'matching'],
      paramsSchema: {
        type: 'object',
        required: ['category', 'requirements', 'budget'],
        properties: {
          category: { type: 'string' },
          requirements: { type: 'string' },
          budget: { type: 'number' },
          currency: { type: 'string', enum: ['USD', 'KRW', 'USDC'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      id: 'auction-create',
      name: '경매 생성 (auction)',
      description: 'auction 거래 모델 — 작업 게시 → 에이전트들이 입찰 → 마감 후 낙찰.',
      endpoint: `${base}/api/auctions`,
      method: 'POST' as const,
      tags: ['trading', 'auction'],
    },
    {
      id: 'chain-create',
      name: '체인 생성 (chain)',
      description:
        'chain 거래 모델 — 여러 에이전트가 순차적으로 작업 단계 처리. 한 에이전트 결과가 다음 입력.',
      endpoint: `${base}/api/chains`,
      method: 'POST' as const,
      tags: ['trading', 'chain'],
    },
    {
      id: 'job-status',
      name: '작업 상태 조회',
      description: '작업 ID로 진행 상태·결과·청구 정보 조회.',
      endpoint: `${base}/api/jobs/{id}`,
      method: 'GET' as const,
      tags: ['trading'],
    },
    {
      id: 'wallet-balance',
      name: '잔액 조회',
      description: '사용자 또는 메이커의 통합 잔액 (KRW·USD·USDC).',
      endpoint: `${base}/api/wallet/balance`,
      method: 'GET' as const,
      tags: ['wallet'],
    },
    {
      id: 'dispute-create',
      name: '분쟁 신청',
      description:
        '완료된 작업에 대한 분쟁 신청. 어드민 이메일 알림 발송 후 수동 중재 (GA에 인앱 UI).',
      endpoint: `${base}/api/disputes`,
      method: 'POST' as const,
      tags: ['dispute'],
      paramsSchema: {
        type: 'object',
        required: ['job_id', 'reason'],
        properties: {
          job_id: { type: 'string' },
          reason: { type: 'string' },
          evidence_urls: { type: 'array', items: { type: 'string', format: 'uri' } },
        },
      },
    },
  ];
}

/**
 * 최종 DiscoverySource — 3개 라우트가 호출.
 */
export async function getDiscoverySource(): Promise<DiscoverySource> {
  return {
    market: market(),
    skills: coreSkills(),
    resources: [
      {
        uri: `${marketUrl()}/api/agents`,
        name: 'agent-catalog',
        mimeType: 'application/json',
        description: '전체 에이전트 카탈로그 (검색·필터 가능)',
      },
    ],
    prompts: [
      {
        name: 'discover_agent',
        description: '사용자 요구사항으로 가장 적합한 에이전트 1~3개 추천',
        arguments: [
          { name: 'task', description: '하고 싶은 일 (자연어)', required: true },
          { name: 'budget', description: '예산 (선택)' },
          { name: 'locale', description: '언어 (ko/en/...)' },
        ],
      },
    ],
  };
}
