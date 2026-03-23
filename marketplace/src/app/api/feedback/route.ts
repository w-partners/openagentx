import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback, getFeedbackStats, getReusageRate } from '@/lib/quality/feedback';
import { recordPromptUsage } from '@/lib/quality/prompt-optimizer';

/**
 * POST /api/feedback — 피드백 제출
 * 인증된 사용자, API 키 사용자, AI 에이전트 모두 제출 가능
 */
export async function POST(request: NextRequest) {
  let body: {
    jobId?: string;
    fulfillQuery?: string;
    agentId?: string;
    serviceName?: string;
    rating?: number;
    isReuse?: boolean;
    responseProvider?: string;
    responseCategory?: string;
    promptId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식입니다.' },
      { status: 400 },
    );
  }

  // 필수 필드 검증
  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json(
      { success: false, error: 'rating은 1-5 사이의 정수여야 합니다.' },
      { status: 400 },
    );
  }

  // 피드백 소스 결정
  const apiKey = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');
  let feedbackSource: 'api' | 'ui' | 'agent' = 'api';

  if (apiKey) {
    feedbackSource = 'agent';
  } else if (authHeader) {
    feedbackSource = 'ui';
  }

  try {
    const feedbackId = await submitFeedback({
      jobId: body.jobId,
      fulfillQuery: body.fulfillQuery,
      agentId: body.agentId,
      serviceName: body.serviceName,
      rating: body.rating,
      isReuse: body.isReuse,
      responseProvider: body.responseProvider,
      responseCategory: body.responseCategory,
      feedbackSource,
    });

    // 프롬프트 사용 기록이 있으면 함께 업데이트
    if (body.promptId) {
      await recordPromptUsage(body.promptId, body.rating).catch(() => {});
    }

    return NextResponse.json(
      { success: true, feedbackId },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      },
    );
  } catch (err) {
    console.error('Feedback submission error:', err);
    return NextResponse.json(
      { success: false, error: '피드백 저장에 실패했습니다.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/feedback — 피드백 통계 조회 (관리자)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId') ?? undefined;

  try {
    const [stats, reusage] = await Promise.all([
      getFeedbackStats(agentId),
      getReusageRate(agentId),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      reusage,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('Feedback stats error:', err);
    return NextResponse.json(
      { success: false, error: '통계 조회에 실패했습니다.' },
      { status: 500 },
    );
  }
}

/** CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}
