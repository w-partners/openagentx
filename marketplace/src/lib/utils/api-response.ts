import { NextResponse } from 'next/server';
import { toErrorMessage } from './constants';

export function apiJson(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: status < 400, ...data }, { status });
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function requireAuth(request: { headers: { get(name: string): string | null } }): string {
  const userId = request.headers.get('x-user-id');
  if (!userId) throw new AuthError();
  return userId;
}

export class AuthError extends Error {
  constructor() {
    super('인증이 필요합니다');
  }
}

export function parsePagination(searchParams: URLSearchParams) {
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  return { limit, offset };
}

/** Safely extract error message and return an apiJson error response */
export function apiCatchError(err: unknown, status = 400) {
  return apiJson({ error: toErrorMessage(err) }, status);
}
