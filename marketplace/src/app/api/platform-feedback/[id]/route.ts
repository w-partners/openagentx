import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as feedbackRepo from '@/lib/db/repositories/platform-feedback';

const patchSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  admin_response: z.string().min(1).max(5000).optional(),
});

// GET /api/platform-feedback/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const item = await feedbackRepo.getFeedback(id, user?.userId ?? null);
    if (!item) return apiJson({ error: '피드백을 찾을 수 없습니다' }, 404);
    return apiJson({ data: item });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}

// PATCH /api/platform-feedback/[id] — admin only (status / admin_response)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);
    if (user.role !== 'admin') return apiJson({ error: '관리자 권한이 필요합니다' }, 403);
    const adminId = user.userId;
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
    }
    if (!parsed.data.status && !parsed.data.admin_response) {
      return apiJson({ error: '수정할 내용이 없습니다' }, 400);
    }

    if (parsed.data.admin_response) {
      await feedbackRepo.addAdminResponse({
        id,
        admin_id: adminId,
        response: parsed.data.admin_response,
        status: parsed.data.status,
      });
    } else if (parsed.data.status) {
      await feedbackRepo.updateStatus({ id, status: parsed.data.status });
    }

    return apiJson({ data: { id } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
