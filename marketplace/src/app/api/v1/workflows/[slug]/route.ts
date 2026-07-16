import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey, hasScope } from '@/lib/auth/api-key-auth';
import * as workflowsRepo from '@/lib/db/repositories/workflows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/workflows/{slug} — detail (incl. definition)
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const w = await workflowsRepo.findBySlug(slug);
    if (!w) return apiJson({ error: '워크플로우를 찾을 수 없습니다' }, 404);
    return apiJson({
      data: {
        id: w.id,
        slug: w.slug,
        name: w.name,
        description: w.description,
        owner_id: w.owner_id,
        definition: w.definition,
        is_public: w.is_public,
        is_featured: w.is_featured,
        use_count: w.use_count,
        category: w.category,
        tags: w.tags,
        created_at: w.created_at,
        updated_at: w.updated_at,
      },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['input', 'agent', 'prompt', 'output', 'condition']),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.unknown()).default({}),
});
const edgeSchema = z.object({ from: z.string(), to: z.string() });

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  definition: z
    .object({
      nodes: z.array(nodeSchema).min(1),
      edges: z.array(edgeSchema),
    })
    .optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).max(20).optional(),
  is_public: z.boolean().optional(),
});

/**
 * PATCH /api/v1/workflows/{slug} — owner only
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '인증이 필요합니다' }, 401);
    }
    if (!hasScope(auth, 'workflows:write')) {
      return apiJson({ error: 'workflows:write 스코프가 필요합니다' }, 403);
    }
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, 400);
    }

    const updated = await workflowsRepo.updateBySlug(
      slug,
      auth.role === 'admin' ? null : auth.userId,
      parsed.data,
    );
    if (!updated) {
      return apiJson({ error: '워크플로우를 찾을 수 없거나 권한이 없습니다' }, 404);
    }
    return apiJson({
      data: { slug: updated.slug, name: updated.name, updated_at: updated.updated_at },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

/**
 * DELETE /api/v1/workflows/{slug} — owner only
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '인증이 필요합니다' }, 401);
    }
    if (!hasScope(auth, 'workflows:write')) {
      return apiJson({ error: 'workflows:write 스코프가 필요합니다' }, 403);
    }
    const ok = await workflowsRepo.deleteBySlug(
      slug,
      auth.role === 'admin' ? null : auth.userId,
    );
    if (!ok) return apiJson({ error: '워크플로우를 찾을 수 없거나 권한이 없습니다' }, 404);
    return apiJson({ data: { deleted: true } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
