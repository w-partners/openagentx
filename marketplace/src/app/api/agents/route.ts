import { NextRequest } from 'next/server';
import * as agentsRepo from '@/lib/db/repositories/agents';
import { hybridSearch } from '@/lib/search/hybrid';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';

const createAgentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(5000),
  description_ko: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).max(20).optional(),
  logo_url: z.string().url().optional(),
  commission_rate: z.number().min(0).max(1).optional(),
  sample_images: z.array(z.string()).max(10).optional(),
});

// GET /api/agents — List/Search agents
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q');
  const category = searchParams.get('category') ?? undefined;
  const sort = searchParams.get('sort') as 'ranking_score' | 'created_at' | 'avg_rating' | 'total_jobs' | null;
  const { limit, offset } = parsePagination(searchParams);

  if (q) {
    const results = await hybridSearch({ q, category, limit, offset });
    return apiJson({ data: results.agents, meta: { total: results.total, limit, offset } });
  }

  const results = await agentsRepo.findAll({
    category,
    sort: sort ?? undefined,
    limit,
    offset,
  });

  return apiJson({ data: results.agents, meta: { total: results.total, limit, offset } });
}

// POST /api/agents — Register agent
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const body = await request.json();
    const parsed = createAgentSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const agentId = await agentsRepo.createAgent({
      owner_id: userId,
      ...parsed.data,
    });
    return apiJson({ data: { id: agentId } }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}
