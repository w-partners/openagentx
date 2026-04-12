import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError, parsePagination } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as commentsRepo from '@/lib/db/repositories/agent-comments';

const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional().nullable(),
});

// GET /api/agents/[id]/comments — list comments + nested replies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const { limit, offset } = parsePagination(request.nextUrl.searchParams);

  try {
    const agentId = await commentsRepo.resolveAgentId(rawId);
    if (!agentId) {
      // Mock/non-persisted agent — return empty list
      return apiJson({
        data: { comments: [], replies: [] },
        meta: { total: 0, limit, offset },
      });
    }
    const result = await commentsRepo.listByAgent(agentId, { limit, offset });
    return apiJson({
      data: {
        comments: result.comments,
        replies: result.replies,
      },
      meta: { total: result.total, limit, offset },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}

// POST /api/agents/[id]/comments — create comment (auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { id: rawId } = await params;
    const agentId = await commentsRepo.resolveAgentId(rawId);
    if (!agentId) return apiJson({ error: '에이전트를 찾을 수 없습니다' }, 404);

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
    }

    const commentId = await commentsRepo.createComment({
      agent_id: agentId,
      user_id: user.userId,
      parent_id: parsed.data.parent_id ?? null,
      body: parsed.data.body,
    });

    return apiJson({ data: { id: commentId } }, 201);
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
