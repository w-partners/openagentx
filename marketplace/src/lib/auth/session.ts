/**
 * lib/auth/session.ts — getSessionUser shim.
 *
 * 기존 코드가 import { getSessionUser } from '@/lib/auth/session'을 기대하나
 * 실제 모듈이 없었음 (api/disputes/route.ts 빌드 깨짐). require-user.ts 위에
 * email까지 fetch하는 얇은 wrapper 추가.
 *
 * 반환: { id, email, role } | null
 */
import type { NextRequest } from 'next/server';
import { requireUser } from './require-user';
import { query } from '@/lib/db/pool';

export interface SessionUser {
  id: string;
  email: string | null;
  role: string;
}

export async function getSessionUser(
  request: NextRequest,
): Promise<SessionUser | null> {
  const u = await requireUser(request);
  if (!u) return null;
  try {
    const r = await query<{ email: string | null }>(
      'SELECT email FROM users WHERE id = $1',
      [u.userId],
    );
    return {
      id: u.userId,
      email: r.rows[0]?.email ?? null,
      role: u.role,
    };
  } catch {
    return { id: u.userId, email: null, role: u.role };
  }
}
