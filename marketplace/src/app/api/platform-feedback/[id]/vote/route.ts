import { NextRequest } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as feedbackRepo from '@/lib/db/repositories/platform-feedback';

// POST /api/platform-feedback/[id]/vote — toggle upvote (auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { id } = await params;
    const result = await feedbackRepo.toggleVote(id, user.userId);

    return apiJson({
      data: {
        voted: result.voted,
        upvote_count: result.upvote_count,
      },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
