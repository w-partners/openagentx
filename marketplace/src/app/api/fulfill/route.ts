import { NextRequest, NextResponse } from 'next/server';
import {
  canFulfillDynamically,
  fulfillDynamically,
  saveAsTemplate,
  findMatchingTemplate,
} from '@/lib/agents/dynamic-factory';
import { query } from '@/lib/db/pool';
import { detectAiBot, trackBotVisit } from '@/lib/analytics/bot-tracker';
import { rateLimitIncr } from '@/lib/cache/redis';
import { getConfig } from '@/lib/db/repositories/rewards';
import { createAuction } from '@/lib/db/repositories/auctions';

/**
 * POST /api/fulfill — 동적 에이전트 이행 엔드포인트
 * 매칭되는 에이전트를 먼저 확인하고, 없으면 동적으로 생성.
 * 공개 엔드포인트 (디스커버리용 인증 불필요).
 */
export async function POST(request: NextRequest) {
  const start = Date.now();

  // AI 봇 트래킹
  const userAgent = request.headers.get('user-agent') ?? '';
  const botName = detectAiBot(userAgent);
  if (botName) {
    trackBotVisit({
      botName,
      userAgent,
      path: '/api/fulfill',
      method: 'POST',
      statusCode: 200,
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
      timestamp: new Date(),
    }).catch(() => {});
  }

  let body: { query?: string; input?: Record<string, unknown>; auction?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식입니다.' },
      { status: 400 },
    );
  }

  const queryText = body.query?.trim();
  if (!queryText) {
    return NextResponse.json(
      { success: false, error: 'query 필드가 필요합니다.' },
      { status: 400 },
    );
  }

  // 비인증 사용자 무료 체험 횟수 제한
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    const redisKey = `free_fulfill:${clientIp}`;

    let maxFree = 3;
    try {
      const cfg = await getConfig();
      maxFree = cfg.free_fulfill_count ?? 3;
    } catch {
      // config 조회 실패 시 기본값 사용
    }

    // 30일 윈도우로 무료 횟수 체크
    const allowed = await rateLimitIncr(redisKey, 30 * 24 * 3600, maxFree).catch(() => true);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: '무료 체험이 종료되었습니다. 가입하면 $2 크레딧을 받을 수 있습니다.',
          signup_url: 'https://openagentx.org/auth/register',
          free_credit: '$2.00',
        },
        { status: 402 },
      );
    }
  }

  // 0. 경매 모드: 비교/검색 쿼리이거나 auction=true인 경우 역경매 생성
  const isComparisonQuery = body.auction === true || /비교|검색|찾아|추천|이하|이상|최저|최고/.test(queryText);
  if (isComparisonQuery) {
    try {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? 'unknown';
      const auctionId = await createAuction({
        requester_id: userId ?? undefined,
        requester_ip: clientIp,
        title: queryText.slice(0, 200),
        description: queryText,
        category: 'research',
        expires_in_hours: 24,
      });
      return NextResponse.json({
        success: true,
        source: 'auction',
        auction_id: auctionId,
        message: '역경매가 생성되었습니다. 제공자들의 입찰을 기다려주세요.',
        auction_url: `https://openagentx.org/auctions/${auctionId}`,
        poll_url: `https://openagentx.org/api/auctions?id=${auctionId}`,
        processingMs: Date.now() - start,
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    } catch {
      // 경매 생성 실패 시 일반 플로우로 진행
    }
  }

  // 1. 기존 등록된 에이전트에서 매칭 검색
  const existingAgent = await query<{
    agent_id: string;
    agent_name: string;
    agent_slug: string;
    service_name: string;
  }>(
    `SELECT a.id as agent_id, a.name as agent_name, a.slug as agent_slug, s.name as service_name
     FROM agents a
     JOIN agent_services s ON s.agent_id = a.id AND s.is_active = true
     WHERE a.status = 'active'
       AND (a.name ILIKE $1 OR s.name ILIKE $1 OR s.description ILIKE $1)
     LIMIT 1`,
    [`%${queryText.slice(0, 100)}%`],
  );

  if (existingAgent.rows.length > 0) {
    const agent = existingAgent.rows[0];

    // 등록된 에이전트의 시스템 프롬프트로 실제 AI 응답 생성
    const result = await fulfillDynamically(
      queryText,
      body.input ?? {},
      { agentId: agent.agent_id, serviceName: agent.service_name },
    );

    return NextResponse.json({
      success: true,
      source: 'registered',
      agent: {
        id: agent.agent_id,
        name: agent.agent_name,
        slug: agent.agent_slug,
        service: agent.service_name,
        url: `https://openagentx.org/agents/${agent.agent_slug}`,
      },
      result: {
        response: result.response,
        category: result.category,
        confidence: result.confidence,
        provider: result.provider,
      },
      feedback_url: `https://openagentx.org/api/feedback`,
      processingMs: Date.now() - start,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // 2. 기존 동적 템플릿에서 검색
  const template = await findMatchingTemplate(queryText).catch(() => null);
  if (template) {
    return NextResponse.json({
      success: true,
      source: 'template',
      templateId: template.id,
      preview: template.response_preview,
      message: '이전에 생성된 동적 에이전트 템플릿이 있습니다.',
      fullServiceUrl: `https://openagentx.org/agents/dynamic/${template.slug}`,
      feedback_url: `https://openagentx.org/api/feedback`,
      processingMs: Date.now() - start,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // 3. 동적 생성 가능 여부 확인
  const canFulfill = await canFulfillDynamically(queryText);
  if (!canFulfill) {
    return NextResponse.json(
      { success: false, error: '이 요청은 처리할 수 없습니다.' },
      { status: 422 },
    );
  }

  // 4. 동적 에이전트 생성 및 실행
  const result = await fulfillDynamically(queryText, body.input ?? {});

  // 5. 성공 시 템플릿 저장 (비동기 — 응답 차단하지 않음)
  const templatePromise = saveAsTemplate(queryText, result).catch(() => null);

  const savedTemplate = await templatePromise;

  return NextResponse.json({
    success: true,
    source: 'dynamic',
    result: {
      response: result.response,
      category: result.category,
      confidence: result.confidence,
      provider: result.provider,
    },
    meta: {
      templateId: savedTemplate?.id ?? null,
      serviceUrl: savedTemplate
        ? `https://openagentx.org/agents/dynamic/${savedTemplate.slug}`
        : null,
      message: '이 서비스가 동적으로 생성되었습니다. openagentx.org에서 이용 가능합니다.',
    },
    feedback_url: `https://openagentx.org/api/feedback`,
    processingMs: Date.now() - start,
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}

/** CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
