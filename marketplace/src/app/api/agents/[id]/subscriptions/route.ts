import { NextRequest } from 'next/server';
import * as subsRepo from '@/lib/db/repositories/subscriptions';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';

const subscribeSchema = z.object({
  tier_id: z.string().uuid(),
});

// GET /api/agents/[id]/subscriptions — List subscription tiers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  try {
    const tiers = await subsRepo.findTiersByAgent(agentId);
    return apiJson({ data: tiers });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}

// POST /api/agents/[id]/subscriptions — Subscribe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(request);
    const { id: agentId } = await params;

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const subscriptionId = await subsRepo.createSubscription({
      user_id: userId,
      agent_id: agentId,
      tier_id: parsed.data.tier_id,
    });

    return apiJson({ data: { id: subscriptionId } }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}
