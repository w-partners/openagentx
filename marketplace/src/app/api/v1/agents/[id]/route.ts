import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { updateAgent, deleteAgent } from '@/lib/db/repositories/custom-agents';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  category: z.string().max(50).optional(),
  pricePoints: z.number().int().min(0).optional(),
  resultType: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  githubRepo: z.string().max(500).optional(),
  referenceUrls: z.array(z.string()).optional(),
  status: z.enum(['active', 'draft']).optional(),
});

/**
 * PUT /api/v1/agents/[id] — 에이전트 수정 (본인만 가능)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const agent = await updateAgent(id, auth.userId, parsed.data);
    if (!agent) {
      return apiJson({ error: '에이전트를 찾을 수 없거나 수정 권한이 없습니다' }, 404);
    }

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
        status: agent.status,
        updatedAt: agent.updated_at,
      },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

/**
 * DELETE /api/v1/agents/[id] — 에이전트 삭제 (본인만 가능, soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const { id } = await params;

    const deleted = await deleteAgent(id, auth.userId);
    if (!deleted) {
      return apiJson({ error: '에이전트를 찾을 수 없거나 삭제 권한이 없습니다' }, 404);
    }

    return apiJson({ message: '에이전트가 삭제되었습니다' });
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
