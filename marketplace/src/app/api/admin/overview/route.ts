/**
 * Admin: 대시보드 개요 4지표.
 *
 * GET /api/admin/overview → { totalUsers, totalAgents, totalTransactions, totalRevenue, revenueCurrency }
 *
 * 개요 카드는 페이징 목록이 아니라 전체 집계를 보여줘야 하므로 COUNT(*) 를 직접 센다.
 * (예전 개요 탭은 /api/admin/users 를 불러 users.length 를 셌는데, 그건 페이지 크기(기본 20)에
 *  걸려 21명부터 20 에서 멈추는 값이었다.)
 */

import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';
import { MARKETPLACE_SETTLEMENT_CURRENCY } from '@/lib/utils/constants';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    // totalRevenue = 플랫폼 수익 = 수수료 합계. 총 거래액(payment_amount 합)은 GMV 이지 수익이 아니다.
    const { rows } = await query<{
      total_users: string;
      total_agents: string;
      total_transactions: string;
      total_revenue: string;
    }>(
      `SELECT (SELECT COUNT(*) FROM users)::text                                AS total_users,
              (SELECT COUNT(*) FROM agents)::text                               AS total_agents,
              (SELECT COUNT(*) FROM marketplace_jobs)::text                     AS total_transactions,
              (SELECT COALESCE(SUM(commission_amount), 0) FROM marketplace_jobs)::text AS total_revenue`,
    );

    const r = rows[0];
    return apiJson({
      totalUsers: parseInt(r.total_users, 10),
      totalAgents: parseInt(r.total_agents, 10),
      totalTransactions: parseInt(r.total_transactions, 10),
      totalRevenue: Number(r.total_revenue),
      revenueCurrency: MARKETPLACE_SETTLEMENT_CURRENCY,
    });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
