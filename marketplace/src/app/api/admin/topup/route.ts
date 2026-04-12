import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import * as topupRepo from '@/lib/db/repositories/topup';

/**
 * GET /api/admin/topup — 충전 요청 목록
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [pending, all] = await Promise.all([
      topupRepo.findPending(),
      topupRepo.findAll(100),
    ]);

    return apiJson({
      pending,
      history: all,
      total: all.length,
    });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}

/**
 * POST /api/admin/topup — 승인/거부
 * body: { action: "approve"|"reject", requestId, reason? }
 */
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    const body = await request.json();
    const { action, requestId, reason } = body as {
      action?: string;
      requestId?: string;
      reason?: string;
    };

    if (!action || !requestId) {
      return apiError('action과 requestId가 필요합니다');
    }

    if (action === 'approve') {
      await topupRepo.approve(requestId, adminId);
      return apiJson({ message: '충전 요청이 승인되었습니다' });
    }

    if (action === 'reject') {
      await topupRepo.reject(requestId, adminId, reason);
      return apiJson({ message: '충전 요청이 거부되었습니다' });
    }

    return apiError('action은 approve 또는 reject이어야 합니다');
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
