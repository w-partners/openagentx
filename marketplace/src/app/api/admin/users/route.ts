import { NextRequest } from 'next/server';
import { apiJson, apiError, requireAuth, AuthError } from '@/lib/utils/api-response';
import * as usersRepo from '@/lib/db/repositories/users';
import { query } from '@/lib/db/pool';

async function requireAdmin(request: NextRequest): Promise<string> {
  const userId = requireAuth(request);
  const user = await usersRepo.findById(userId);
  if (!user || user.role !== 'admin') {
    throw new ForbiddenError();
  }
  return userId;
}

class ForbiddenError extends Error {
  constructor() {
    super('관리자 권한이 필요합니다');
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const result = await query<{
      id: string;
      email: string | null;
      nickname: string;
      role: string;
      created_at: Date;
      is_active: boolean;
    }>(
      'SELECT id, email, nickname, role, created_at, COALESCE(is_active, true) as is_active FROM users ORDER BY created_at DESC',
    );

    return apiJson({ users: result.rows });
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
