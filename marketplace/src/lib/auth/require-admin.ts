import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/api-response';
import * as usersRepo from '@/lib/db/repositories/users';

export class ForbiddenError extends Error {
  constructor() {
    super('관리자 권한이 필요합니다');
  }
}

export async function requireAdmin(request: NextRequest): Promise<string> {
  const userId = requireAuth(request);
  const user = await usersRepo.findById(userId);
  if (!user || user.role !== 'admin') {
    throw new ForbiddenError();
  }
  return userId;
}
