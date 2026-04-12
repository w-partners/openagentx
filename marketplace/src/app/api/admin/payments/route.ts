import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';

/**
 * GET /api/admin/payments — 전체 결제 내역
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = (page - 1) * limit;
    const type = searchParams.get('type'); // payment_type filter

    const conditions = ['1=1'];
    const values: unknown[] = [];
    let idx = 1;

    if (type) {
      conditions.push(`p.payment_type = $${idx++}`);
      values.push(type);
    }

    const where = conditions.join(' AND ');

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
         WHERE ${where}
         ORDER BY p.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM payments p WHERE ${where}`,
        values,
      ),
    ]);

    return apiJson({
      payments: dataResult.rows,
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
