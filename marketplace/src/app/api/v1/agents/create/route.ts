import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { createAgent } from '@/lib/db/repositories/custom-agents';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  systemPrompt: z.string().min(1),
  category: z.string().max(50).optional(),
  pricePoints: z.number().int().min(0).optional(),
  resultType: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  githubRepo: z.string().max(500).optional(),
  referenceUrls: z.array(z.string()).optional(),
});

/**
 * POST /api/v1/agents/create — 에이전트 생성
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const agent = await createAgent(auth.userId, parsed.data);

    return apiJson({
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        category: agent.category,
        pricePoints: agent.price_points,
        resultType: agent.result_type,
        tags: agent.tags,
        capabilities: agent.capabilities,
        sampleInput: agent.sample_input,
        sampleOutput: agent.sample_output,
        githubRepo: agent.github_repo,
        referenceUrls: agent.reference_urls,
        status: agent.status,
        createdAt: agent.created_at,
      },
    }, 201);
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
