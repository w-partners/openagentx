import { NextRequest } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import { query } from '@/lib/db/pool';

/**
 * GET /api/balance
 * 현재 사용자 잔액 및 포인트 정보 반환
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const [balanceResult, topupResult, purchaseResult, withdrawalResult] = await Promise.all([
      // 현재 잔액
      query<{ balance_usdc: string }>(
        'SELECT balance_usdc FROM users WHERE id = $1',
        [user.userId],
      ),
      // 충전 합계
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM topup_requests
         WHERE user_id = $1 AND status = 'completed'`,
        [user.userId],
      ),
      // 구매 합계
      query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(payment_amount), 0) as total, COUNT(*) as count
         FROM marketplace_jobs
         WHERE buyer_id = $1`,
        [user.userId],
      ),
      // 출금 합계
      query<{ total: string; pending: string }>(
        `SELECT
           COALESCE(SUM(amount), 0) as total,
           COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending
         FROM withdrawals
         WHERE user_id = $1`,
        [user.userId],
      ),
    ]);

    if (balanceResult.rows.length === 0) {
      return apiJson({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    return apiJson({
      data: {
        balance: parseFloat(balanceResult.rows[0].balance_usdc),
        topup: {
          total: parseFloat(topupResult.rows[0].total),
        },
        purchase: {
          total: parseFloat(purchaseResult.rows[0].total),
          count: parseInt(purchaseResult.rows[0].count, 10),
        },
        withdrawal: {
          total: parseFloat(withdrawalResult.rows[0].total),
          pending: parseFloat(withdrawalResult.rows[0].pending),
        },
      },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
