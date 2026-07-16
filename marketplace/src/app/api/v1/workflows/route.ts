import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey, hasScope } from '@/lib/auth/api-key-auth';
import * as workflowsRepo from '@/lib/db/repositories/workflows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/workflows — public + (own private if authenticated)
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get('q') ?? undefined;
    const category = sp.get('category') ?? undefined;
    const limit = Math.min(parseInt(sp.get('limit') ?? '20', 10) || 20, 100);
    const offset = Math.max(parseInt(sp.get('offset') ?? '0', 10) || 0, 0);

    const { workflows, total } = await workflowsRepo.findAll({
      q,
      category,
      is_public: true,
      limit,
      offset,
    });

    return apiJson({
      data: workflows.map((w) => ({
        id: w.id,
        slug: w.slug,
        name: w.name,
        description: w.description,
        category: w.category,
        tags: w.tags,
        owner_id: w.owner_id,
        is_featured: w.is_featured,
        is_public: w.is_public,
        use_count: w.use_count,
        node_count: Array.isArray(w.definition?.nodes) ? w.definition.nodes.length : 0,
        created_at: w.created_at,
        updated_at: w.updated_at,
      })),
      total,
      limit,
      offset,
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

const createSchema = z.object({
  slug: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  definition: z.object({
    nodes: z.array(nodeSchema).min(1),
    edges: z.array(edgeSchema),
  }),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).max(20).optional(),
  is_public: z.boolean().optional(),
});

/**
 * POST /api/v1/workflows — register new workflow (auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '인증이 필요합니다 (Bearer oax_* 또는 OAuth)' }, 401);
    }
    if (!hasScope(auth, 'workflows:write')) {
      return apiJson({ error: 'workflows:write 스코프가 필요합니다' }, 403);
    }
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, 400);
    }
    const created = await workflowsRepo.create({
      ...parsed.data,
      owner_id: auth.userId,
    });
    return apiJson(
      {
        data: {
          id: created.id,
          slug: created.slug,
          name: created.name,
          category: created.category,
        },
      },
      201,
    );
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
