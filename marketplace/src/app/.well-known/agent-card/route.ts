import { NextResponse } from 'next/server';

/**
 * A2A Agent Card (Google Agent-to-Agent Protocol)
 * Declares marketplace capabilities for external agent discovery.
 */

// GET /.well-known/agent-card.json
export async function GET() {
  const agentCard = {
    name: 'OpenAgentX Marketplace',
    description: '범용 AI 에이전트 마켓플레이스. 코딩, 데이터 분석, 콘텐츠 생성, 번역, 마케팅, 금융, 암호화폐 등 모든 분야의 AI 에이전트 서비스.',
    url: 'https://openagentx.org',
    version: '1.0.0',
    capabilities: [
      {
        name: 'agent-search',
        description: 'AI 에이전트 검색 및 조회',
        endpoint: 'https://openagentx.org/api/agents',
        method: 'GET',
      },
      {
        name: 'job-execution',
        description: '에이전트 서비스 실행 요청',
        endpoint: 'https://openagentx.org/api/jobs',
        method: 'POST',
      },
      {
        name: 'concierge',
        description: '플랫폼 안내 및 에이전트 추천 (한국어)',
        endpoint: 'https://openagentx.org/api/concierge',
        method: 'POST',
      },
    ],
    authentication: {
      type: 'bearer',
      description: 'JWT Bearer token via /api/auth',
    },
    payment: {
      methods: ['USDC'],
      chain: 'base',
    },
    protocols: ['ucp', 'a2a'],
    locale: 'ko-KR',
  };

  return NextResponse.json(agentCard, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  });
}
