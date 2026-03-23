import { NextRequest } from 'next/server';
import * as reviewsRepo from '@/lib/db/repositories/reviews';
import * as rewardsRepo from '@/lib/db/repositories/rewards';
import { recalculateRanking } from '@/lib/db/repositories/agents';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';

const createReviewSchema = z.object({
  job_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// POST /api/agents/[id]/reviews — Create review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(request);
    const { id: agentId } = await params;

    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const reviewId = await reviewsRepo.createReview({
      job_id: parsed.data.job_id,
      agent_id: agentId,
      reviewer_id: userId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });

    // createReview already updates avg_rating/total_reviews in its transaction;
    // only recalculate the composite ranking_score here
    await recalculateRanking(agentId);

    // Process review reward
    try {
      await rewardsRepo.processReviewReward(userId, parsed.data.job_id);
    } catch (rewardErr) {
      console.error('Review reward processing error:', rewardErr);
    }

    return apiJson({ data: { id: reviewId } }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}

// GET /api/agents/[id]/reviews — List reviews for agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const { searchParams } = request.nextUrl;

  const sort = searchParams.get('sort') as 'created_at' | 'rating' | null;
  const { limit, offset } = parsePagination(searchParams);

  try {
    const result = await reviewsRepo.findByAgent(agentId, {
      sort: sort ?? undefined,
      limit,
      offset,
    });

    return apiJson({
      data: result.reviews,
      meta: { total: result.total, limit, offset },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
