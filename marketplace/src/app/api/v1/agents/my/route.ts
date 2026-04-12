import { NextRequest, NextResponse } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { findByCreator } from '@/lib/db/repositories/custom-agents';

/**
 * GET /api/v1/agents/my — 내가 만든 에이전트 목록
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const agents = await findByCreator(auth.userId);

    return apiJson({
      data: agents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        pricePoints: a.price_points,
        resultType: a.result_type,
        tags: a.tags,
        capabilities: a.capabilities,
        sampleInput: a.sample_input,
        sampleOutput: a.sample_output,
        githubRepo: a.github_repo,
        referenceUrls: a.reference_urls,
        status: a.status,
        usageCount: a.usage_count,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
      meta: { total: agents.length },
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
