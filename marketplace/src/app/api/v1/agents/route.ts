import { NextRequest, NextResponse } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { DEFAULT_AGENTS } from '@/lib/partner/agents';
import { findActive } from '@/lib/db/repositories/custom-agents';

/**
 * GET /api/v1/agents — 사용자 API Key로 에이전트 목록 조회
 * DEFAULT_AGENTS + DB custom_agents (status='active') 합산 반환
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    // Merge default agents + custom agents from DB
    const customAgents = await findActive();
    const customFormatted = customAgents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      sampleInput: a.sample_input ?? '',
      sampleOutput: a.sample_output ?? '',
      resultType: a.result_type,
      pricePoints: a.price_points,
      tags: a.tags,
      capabilities: a.capabilities,
      isCustom: true,
      creatorId: a.creator_id,
      usageCount: a.usage_count,
    }));

    const allAgents = [
      ...DEFAULT_AGENTS.map((a) => ({ ...a, isCustom: false })),
      ...customFormatted,
    ];

    return apiJson({
      data: allAgents,
      meta: { total: allAgents.length },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
