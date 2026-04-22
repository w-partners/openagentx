import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/api-response';
import * as usersRepo from '@/lib/db/repositories/users';

export class ForbiddenError extends Error {
  constructor() {
    super('관리자 권한이 필요합니다');
  }
}

const ADMIN_ROLES = ['admin', 'site_admin', 'platform_admin'];

export async function requireAdmin(request: NextRequest): Promise<string> {
  const userId = requireAuth(request);
  const user = await usersRepo.findById(userId);
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    throw new ForbiddenError();
  }
  return userId;
}
