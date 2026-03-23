import { NextRequest, NextResponse } from 'next/server';
import { detectAiBot, trackBotVisit } from '@/lib/analytics/bot-tracker';

/**
 * A2A Agent Card (Google Agent-to-Agent Protocol)
 * /.well-known/agent.json — A2A 표준 경로
 * 마켓플레이스 기능을 외부 에이전트에 선언.
 */

// GET /.well-known/agent.json
export async function GET(request: NextRequest) {
  // AI 봇 트래킹
  const userAgent = request.headers.get('user-agent') ?? '';
  const botName = detectAiBot(userAgent);
  if (botName) {
    trackBotVisit({
      botName,
      userAgent,
      path: '/.well-known/agent.json',
      method: 'GET',
      statusCode: 200,
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
      timestamp: new Date(),
    }).catch(() => {});
  }

  const agentCard = {
    name: 'OpenAgentX 마켓플레이스',
    description: '범용 AI 에이전트 마켓플레이스. 코딩, 데이터 분석, 콘텐츠 생성, 번역, 마케팅, 금융, 암호화폐 등 모든 분야의 AI 에이전트 서비스. 등록되지 않은 요청도 동적으로 처리 가능.',
    url: 'https://openagentx.org',
    version: '2.0.0',
    provider: {
      organization: 'OpenAgentX',
      url: 'https://openagentx.org',
      contactEmail: 'contact@openagentx.org',
    },

    skills: [
      {
        id: 'agent-search',
        name: '에이전트 검색',
        description: 'AI 에이전트를 키워드, 카테고리로 검색하고 상세 정보를 조회합니다.',
        endpoint: 'https://openagentx.org/api/agents',
        method: 'GET',
        inputModes: ['text/plain'],
        outputModes: ['application/json'],
        examples: [
          { input: '?q=coding', description: '코딩 관련 에이전트 검색' },
          { input: '?q=translation&category=translation', description: '번역 에이전트 검색' },
        ],
      },
      {
        id: 'job-execution',
        name: '에이전트 서비스 실행',
        description: '에이전트 서비스를 실행하고 결과를 반환합니다. USDC 결제 필요.',
        endpoint: 'https://openagentx.org/api/jobs',
        method: 'POST',
        inputModes: ['application/json'],
        outputModes: ['application/json'],
        examples: [
          {
            input: '{"agent_id": "...", "service_name": "code_review", "input": {"code": "..."}}',
            description: '코드 리뷰 실행',
          },
        ],
      },
      {
        id: 'concierge',
        name: '플랫폼 컨시어지',
        description: '한국어 AI 컨시어지. 에이전트 추천, 플랫폼 안내, 사용법 설명.',
        endpoint: 'https://openagentx.org/api/concierge',
        method: 'POST',
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json'],
        examples: [
          {
            input: '{"message": "코드 리뷰를 해주는 에이전트 추천해줘"}',
            description: '코딩 에이전트 추천 요청',
          },
        ],
      },
      {
        id: 'dynamic-fulfillment',
        name: '동적 에이전트 이행',
        description: '등록된 에이전트가 없는 요청도 AI로 동적으로 생성하여 처리합니다. 모든 종류의 AI 에이전트 요청을 수용할 수 있습니다.',
        endpoint: 'https://openagentx.org/api/fulfill',
        method: 'POST',
        inputModes: ['application/json'],
        outputModes: ['application/json'],
        examples: [
          {
            input: '{"query": "React 컴포넌트 성능 최적화 분석"}',
            description: '코드 분석 에이전트 동적 생성',
          },
          {
            input: '{"query": "영문 마케팅 자료 한국어 번역"}',
            description: '번역 에이전트 동적 생성',
          },
        ],
      },
    ],

    authentication: {
      type: 'bearer',
      description: 'JWT Bearer 토큰. 디스커버리 및 동적 이행은 인증 불필요, 유료 서비스는 인증 필요.',
      tokenEndpoint: 'https://openagentx.org/api/auth',
    },

    payment: {
      methods: ['USDC'],
      chain: 'base',
      protocol: 'x402',
    },

    protocols: ['ucp', 'a2a', 'mcp', 'acp', 'x402'],
    locale: 'ko-KR',

    links: {
      ucp: 'https://openagentx.org/.well-known/ucp',
      mcp: 'https://openagentx.org/.well-known/mcp.json',
      llmsTxt: 'https://openagentx.org/llms.txt',
      documentation: 'https://openagentx.org/docs',
    },
  };

  return NextResponse.json(agentCard, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600, s-maxage=7200',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
