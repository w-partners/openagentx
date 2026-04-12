import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as commentsRepo from '@/lib/db/repositories/agent-comments';

const updateSchema = z.object({
  body: z.string().min(1).max(2000),
});

// PATCH /api/agents/[id]/comments/[commentId] — edit own comment (or admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { commentId } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
    }

    await commentsRepo.updateComment({
      id: commentId,
      user_id: user.userId,
      is_admin: user.role === 'admin',
      body: parsed.data.body,
    });

    return apiJson({ data: { id: commentId } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

// DELETE /api/agents/[id]/comments/[commentId] — soft-delete own comment (or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { commentId } = await params;

    await commentsRepo.deleteComment({
      id: commentId,
      user_id: user.userId,
      is_admin: user.role === 'admin',
    });

    return apiJson({ data: { id: commentId } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
