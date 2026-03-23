import { NextRequest } from 'next/server';
import { apiJson, apiError, requireAuth, AuthError } from '@/lib/utils/api-response';
import * as referralRepo from '@/lib/db/repositories/referrals';
import * as usersRepo from '@/lib/db/repositories/users';

// GET /api/referral — get my referral code + stats + share history
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const stats = await referralRepo.getStats(userId);
    const shares = await referralRepo.getShareHistory(userId);

    return apiJson({ data: { ...stats, shares } });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    return apiError(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

// POST /api/referral — action-based routing
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'generate': {
        const code = await referralRepo.generateCode(userId);
        return apiJson({ data: { code: code.code } });
      }

      case 'submit-share': {
        const { platform, shareUrl } = body as { platform: string; shareUrl: string };
        if (!platform || !shareUrl) {
          return apiError('플랫폼과 공유 URL을 입력해주세요');
        }
        const validPlatforms = ['twitter', 'telegram', 'facebook', 'other'];
        if (!validPlatforms.includes(platform)) {
          return apiError('유효하지 않은 플랫폼입니다');
        }
        try {
          new URL(shareUrl);
        } catch {
          return apiError('유효한 URL을 입력해주세요');
        }
        const share = await referralRepo.submitShare(userId, platform, shareUrl);
        return apiJson({ data: { share } }, 201);
      }

      case 'approve-share': {
        const user = await usersRepo.findById(userId);
        if (!user || user.role !== 'admin') {
          return apiError('관리자 권한이 필요합니다', 403);
        }
        const { shareId } = body as { shareId: string };
        if (!shareId) return apiError('shareId가 필요합니다');
        await referralRepo.approveShare(shareId, userId);
        return apiJson({ data: { message: '공유 인증이 승인되었습니다' } });
      }

      case 'reject-share': {
        const user = await usersRepo.findById(userId);
        if (!user || user.role !== 'admin') {
          return apiError('관리자 권한이 필요합니다', 403);
        }
        const { shareId: sid } = body as { shareId: string };
        if (!sid) return apiError('shareId가 필요합니다');
        await referralRepo.rejectShare(sid, userId);
        return apiJson({ data: { message: '공유 인증이 거부되었습니다' } });
      }

      case 'pending-shares': {
        const user = await usersRepo.findById(userId);
        if (!user || user.role !== 'admin') {
          return apiError('관리자 권한이 필요합니다', 403);
        }
        const pending = await referralRepo.getPendingShares();
        return apiJson({ data: { pending } });
      }

      default:
        return apiError('올바른 action을 지정해주세요');
    }
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    return apiError(err instanceof Error ? err.message : '서버 오류', 500);
  }
}
