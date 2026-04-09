import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';

/**
 * Extract and verify user from access_token cookie.
 * Returns { userId, role } on success, null on failure.
 */
export async function requireUser(
  request: NextRequest,
): Promise<{ userId: string; role: string } | null> {
  const token = request.cookies.get('access_token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  return { userId: payload.userId, role: payload.role };
}
