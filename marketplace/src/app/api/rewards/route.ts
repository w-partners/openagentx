import { NextRequest } from 'next/server';
import * as rewardsRepo from '@/lib/db/repositories/rewards';
import * as usersRepo from '@/lib/db/repositories/users';
import { z } from 'zod';
import {
  apiJson,
  apiCatchError,
  requireAuth,
  AuthError,
  parsePagination,
} from '@/lib/utils/api-response';

const updateConfigSchema = z.object({
  action: z.literal('admin-config'),
  id: z.string().min(1),
  value: z.number(),
});

// GET /api/rewards — My reward history + stats, or admin config
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const { searchParams } = request.nextUrl;

    // Admin: get all config values
    if (searchParams.get('admin') === 'true') {
      const user = await usersRepo.findById(userId);
      if (!user || user.role !== 'admin') {
        return apiJson({ error: '관리자 권한이 필요합니다' }, 403);
      }

      const configs = await rewardsRepo.getConfigWithDescriptions();
      return apiJson({ data: configs });
    }

    // Normal user: reward history + stats
    const { limit, offset } = parsePagination(searchParams);
    const [history, stats] = await Promise.all([
      rewardsRepo.getRewardHistory(userId, limit, offset),
      rewardsRepo.getRewardStats(userId),
    ]);

    return apiJson({
      data: {
        rewards: history.rewards,
        total: history.total,
        stats,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}

// POST /api/rewards — Admin config update
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const body = await request.json();
    const parsed = updateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    // Admin only
    const user = await usersRepo.findById(userId);
    if (!user || user.role !== 'admin') {
      return apiJson({ error: '관리자 권한이 필요합니다' }, 403);
    }

    await rewardsRepo.updateConfig(parsed.data.id, parsed.data.value);

    return apiJson({ data: { id: parsed.data.id, value: parsed.data.value } });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}
