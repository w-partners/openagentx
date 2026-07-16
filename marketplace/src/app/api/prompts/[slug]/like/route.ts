import { NextRequest } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/prompts/{slug}/like — 좋아요 토글 (세션 쿠키)
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '로그인이 필요합니다' }, 401);

    const result = await promptsRepo.toggleLike(user.userId, slug);
    if (!result) return apiJson({ error: '프롬프트를 찾을 수 없습니다' }, 404);

    return apiJson({ data: result });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

/**
 * GET /api/prompts/{slug}/like — 현재 사용자의 like 상태 조회
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const user = await requireUser(request);
    if (!user) return apiJson({ data: { liked: false } });

    const liked = await promptsRepo.hasLiked(user.userId, slug);
    return apiJson({ data: { liked } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
