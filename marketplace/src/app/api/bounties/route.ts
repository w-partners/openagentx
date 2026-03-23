import { NextRequest } from 'next/server';
import * as bountiesRepo from '@/lib/db/repositories/bounties';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';

const createBountySchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(1),
  budget_usdc: z.number().positive(),
  deadline: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// POST /api/bounties — Create bounty
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const body = await request.json();
    const parsed = createBountySchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const bountyId = await bountiesRepo.createBounty({
      creator_id: userId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      budget_usdc: parsed.data.budget_usdc,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      metadata: parsed.data.metadata,
    });

    return apiJson({ data: { id: bountyId } }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}

// GET /api/bounties — List bounties
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const status = searchParams.get('status') as bountiesRepo.BountyStatus | null;
  const category = searchParams.get('category') ?? undefined;
  const { limit, offset } = parsePagination(searchParams);

  try {
    const result = await bountiesRepo.findAll({
      status: status ?? undefined,
      category,
      limit,
      offset,
    });

    return apiJson({
      data: result.bounties,
      meta: { total: result.total, limit, offset },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
