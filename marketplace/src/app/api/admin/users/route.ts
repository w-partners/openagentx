import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') ?? '';
    const roleFilter = searchParams.get('role') ?? '';

    const conditions = ['1=1'];
    const values: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(email ILIKE $${idx} OR nickname ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (roleFilter) {
      conditions.push(`role = $${idx++}`);
      values.push(roleFilter);
    }

    const where = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query<{
        id: string;
        email: string | null;
        nickname: string;
        role: string;
        balance_usdc: number;
        created_at: Date;
        is_active: boolean;
      }>(
        `SELECT id, email, nickname, role, balance_usdc, created_at, COALESCE(is_active, true) as is_active
         FROM users
         WHERE ${where}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM users WHERE ${where}`,
        values,
      ),
    ]);

    return apiJson({
      users: dataResult.rows,
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

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { action } = body;

    if (action === 'updateRole') {
      const { userId, role } = body;
      if (!userId || !role) return apiError('userId and role are required');
      if (!['user', 'admin'].includes(role)) return apiError('Invalid role');
      await query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
      return apiJson({ message: 'Role updated' });
    }

    if (action === 'toggleActive') {
      const { userId } = body;
      if (!userId) return apiError('userId is required');
      // Ensure is_active column exists
      await query(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE',
      );
      await query(
        'UPDATE users SET is_active = NOT COALESCE(is_active, true) WHERE id = $1',
        [userId],
      );
      return apiJson({ message: 'User active status toggled' });
    }

    return apiError('Invalid action');
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
