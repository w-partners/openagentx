import { NextRequest } from 'next/server';
import { apiJson, apiError, requireAuth, AuthError } from '@/lib/utils/api-response';
import * as topupRepo from '@/lib/db/repositories/topup';
import * as usersRepo from '@/lib/db/repositories/users';

export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const user = await usersRepo.findById(userId);
    if (!user) return apiError('사용자를 찾을 수 없습니다', 404);

    // Admin sees all requests; regular user sees own requests
    if (user.role === 'admin') {
      const pending = await topupRepo.findPending();
      const all = await topupRepo.findAll();
      return apiJson({ pending, history: all });
    }

    const requests = await topupRepo.findByUser(userId);
    return apiJson({ requests });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    return apiError(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();
    const { action } = body as { action: string };

    if (action === 'request') {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount < 1 || amount > 1000) {
        return apiError('충전 금액은 $1 ~ $1,000 범위여야 합니다');
      }
      const req = await topupRepo.createRequest(userId, amount);
      return apiJson({ request: req }, 201);
    }

    if (action === 'approve' || action === 'reject') {
      const user = await usersRepo.findById(userId);
      if (!user || user.role !== 'admin') {
        return apiError('관리자 권한이 필요합니다', 403);
      }

      const { requestId, reason } = body as { requestId: string; reason?: string };
      if (!requestId) return apiError('requestId가 필요합니다');

      if (action === 'approve') {
        await topupRepo.approve(requestId, userId);
        return apiJson({ message: '충전 요청이 승인되었습니다' });
      } else {
        await topupRepo.reject(requestId, userId, reason);
        return apiJson({ message: '충전 요청이 거부되었습니다' });
      }
    }

    return apiError('올바른 action을 지정해주세요 (request, approve, reject)');
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    return apiError(err instanceof Error ? err.message : '서버 오류', 500);
  }
}
