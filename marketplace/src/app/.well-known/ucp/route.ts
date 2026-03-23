import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { detectAiBot, trackBotVisit } from '@/lib/analytics/bot-tracker';

/**
 * UCP (Universal Commerce Protocol) 디스커버리 엔드포인트
 * 등록된 에이전트 + 동적 생성 기능 선언.
 * 외부 AI(Gemini, Claude 등)가 마켓플레이스를 발견하고 서비스를 탐색.
 */

interface UcpCapability {
  name: string;
  version: string;
  spec: string;
  schema: string;
}

interface UcpService {
  type: string;
  url: string;
  description: string;
}

interface UcpAgent {
  id: string;
  name: string;
  slug: string;
  offerings: Array<{
    name: string;
    description: string;
    price: { amount: number; currency: string };
  }>;
}

// GET /.well-known/ucp — UCP 매니페스트
export async function GET(request: NextRequest) {
  // AI 봇 트래킹
  const userAgent = request.headers.get('user-agent') ?? '';
  const botName = detectAiBot(userAgent);
  if (botName) {
    trackBotVisit({
      botName,
      userAgent,
      path: '/.well-known/ucp',
      method: 'GET',
      statusCode: 200,
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
      timestamp: new Date(),
    }).catch(() => {});
  }

  // UCP 활성화된 에이전트 조회
  const result = await query<{
    agent_id: string;
    agent_name: string;
    agent_slug: string;
    service_name: string;
    service_description: string;
    price_usdc: number;
  }>(
    `SELECT a.id as agent_id, a.name as agent_name, a.slug as agent_slug,
            s.name as service_name, s.description as service_description, s.price_usdc
     FROM agents a
     JOIN agent_protocol_settings ps ON ps.agent_id = a.id
     JOIN agent_services s ON s.agent_id = a.id AND s.is_active = true
     WHERE a.status = 'active' AND ps.enable_ucp = true`,
  );

  const capabilities: UcpCapability[] = [
    {
      name: 'dev.ucp.shopping.checkout',
      version: '2026-03-01',
      spec: 'https://openagentx.org/docs/ucp/checkout',
      schema: 'https://openagentx.org/api/ucp/schema/checkout',
    },
    {
      name: 'dev.ucp.shopping.catalog',
      version: '2026-03-01',
      spec: 'https://openagentx.org/docs/ucp/catalog',
      schema: 'https://openagentx.org/api/ucp/schema/catalog',
    },
    {
      name: 'dev.ucp.agent.discovery',
      version: '2026-03-01',
      spec: 'https://openagentx.org/docs/ucp/discovery',
      schema: 'https://openagentx.org/api/ucp/schema/discovery',
    },
    {
      name: 'dev.ucp.agent.dynamic-fulfillment',
      version: '2026-03-01',
      spec: 'https://openagentx.org/docs/ucp/dynamic-fulfillment',
      schema: 'https://openagentx.org/api/ucp/schema/dynamic-fulfillment',
    },
  ];

  const services: UcpService[] = [
    {
      type: 'REST',
      url: 'https://openagentx.org/api',
      description: '에이전트 검색, 작업 실행, 결제 API',
    },
    {
      type: 'REST',
      url: 'https://openagentx.org/api/fulfill',
      description: '동적 에이전트 이행 — 등록되지 않은 서비스도 AI로 즉시 처리',
    },
    {
      type: 'REST',
      url: 'https://openagentx.org/api/concierge',
      description: '한국어 AI 컨시어지 — 에이전트 추천 및 플랫폼 안내',
    },
  ];

  const agents: UcpAgent[] = result.rows.map((r) => ({
    id: r.agent_id,
    name: r.agent_name,
    slug: r.agent_slug,
    offerings: [{
      name: r.service_name,
      description: r.service_description,
      price: { amount: r.price_usdc, currency: 'USDC' },
    }],
  }));

  const manifest = {
    name: 'OpenAgentX AI 에이전트 마켓플레이스',
    description: '모든 분야의 AI 에이전트를 검색, 구매, 실행할 수 있는 범용 멀티 프로토콜 마켓플레이스. 코딩, 데이터 분석, 콘텐츠 생성, 번역, 마케팅, 금융, 암호화폐 등 다양한 카테고리를 지원합니다.',
    url: 'https://openagentx.org',
    version: '2.0.0',
    locale: 'ko-KR',

    capabilities,
    services,

    // 등록된 에이전트
    agents,
    totalAgents: agents.length,

    // 동적 이행 기능
    dynamicFulfillment: {
      enabled: true,
      description: '등록된 에이전트가 없는 요청도 AI로 동적 생성하여 처리합니다.',
      endpoint: 'https://openagentx.org/api/fulfill',
      method: 'POST',
      categories: ['coding', 'data_analysis', 'content_creation', 'translation', 'marketing', 'customer_service', 'research', 'finance', 'crypto', 'design', 'education', 'automation'],
      exampleQueries: [
        'React 코드 리뷰 및 버그 수정',
        '매출 데이터 시각화 리포트 생성',
        'SEO 최적화된 블로그 콘텐츠 작성',
        '한국어-영어 기술 문서 번역',
        '암호화폐 포트폴리오 분석',
      ],
    },

    // 결제 정보
    payment: {
      handlers: [
        { type: 'usdc', chain: 'base', supported: true },
        { type: 'x402', supported: true },
      ],
    },

    // 프로토콜 지원
    protocols: ['ucp', 'a2a', 'mcp', 'acp', 'x402'],

    // 디스커버리 링크
    links: {
      a2a: 'https://openagentx.org/.well-known/agent.json',
      mcp: 'https://openagentx.org/.well-known/mcp.json',
      llmsTxt: 'https://openagentx.org/llms.txt',
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600, s-maxage=7200',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
