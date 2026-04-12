import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import * as usersRepo from '@/lib/db/repositories/users';
import { query, transaction } from '@/lib/db/pool';
import type { PoolClient } from 'pg';

/**
 * GET /api/admin/points — 포인트 지급/차감 내역
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      query<{
        id: string;
        user_id: string;
        payment_type: string;
        amount: number;
        currency: string;
        status: string;
        metadata: Record<string, unknown> | null;
        created_at: Date;
        user_email: string | null;
        user_nickname: string;
      }>(
        `SELECT p.id, p.user_id, p.payment_type, p.amount, p.currency, p.status, p.metadata, p.created_at,
                u.email as user_email, u.nickname as user_nickname
         FROM payments p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.payment_type IN ('admin_grant', 'admin_revoke')
         ORDER BY p.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM payments WHERE payment_type IN ('admin_grant', 'admin_revoke')`,
      ),
    ]);

    return apiJson({
      records: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit,
    });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}

/**
 * POST /api/admin/points — 포인트 지급/차감
 * body: { userId, amount, type: "grant"|"revoke", reason }
 */
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    const body = await request.json();
    const { userId, amount, type, reason } = body as {
      userId?: string;
      amount?: number;
      type?: string;
      reason?: string;
    };

    if (!userId) return apiError('userId가 필요합니다');
    if (!amount || typeof amount !== 'number' || amount <= 0) return apiError('유효한 amount가 필요합니다');
    if (!type || !['grant', 'revoke'].includes(type)) return apiError('type은 grant 또는 revoke이어야 합니다');
    if (!reason) return apiError('reason이 필요합니다');

    const targetUser = await usersRepo.findById(userId);
    if (!targetUser) return apiError('사용자를 찾을 수 없습니다', 404);

    const paymentType = type === 'grant' ? 'admin_grant' : 'admin_revoke';
    const balanceChange = type === 'grant' ? amount : -amount;

    await transaction(async (client: PoolClient) => {
      // Update user balance
      if (type === 'revoke') {
        const result = await client.query(
          'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING id',
          [amount, userId],
        );
        if (result.rowCount === 0) {
          throw new Error('잔액이 부족합니다');
        }
      } else {
        await client.query(
          'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
          [amount, userId],
        );
      }

      // Record payment
      await client.query(
        `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
         VALUES ($1, $2, $3, 'USDC', 'completed', $4)`,
        [userId, paymentType, amount, JSON.stringify({ reason, adminId, balanceChange })],
      );
    });

    // Get updated balance
    const newBalance = await usersRepo.getBalance(userId);

    return apiJson({
      message: type === 'grant' ? '포인트가 지급되었습니다' : '포인트가 차감되었습니다',
      newBalance,
    });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    const msg = err instanceof Error ? err.message : 'Server error';
    return apiError(msg, msg === '잔액이 부족합니다' ? 400 : 500);
  }
}
