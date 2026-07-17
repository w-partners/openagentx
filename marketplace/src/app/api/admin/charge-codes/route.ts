import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { listCodes, createCodes } from '@/lib/db/repositories/charge-codes';

/**
 * GET /api/admin/charge-codes — 충전 코드 목록
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = (page - 1) * limit;
    const status = searchParams.get('status'); // 'active' | 'used'

    const { items, total } = await listCodes({ status, limit, offset });

    return apiJson({ codes: items, total, page, limit });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}

/**
 * POST /api/admin/charge-codes — 충전 코드 생성
 * body: { points, count }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { points, count } = body as { points?: number; count?: number };

    if (!points || typeof points !== 'number' || points <= 0) {
      return apiError('유효한 points가 필요합니다');
    }
    if (!count || typeof count !== 'number' || count < 1 || count > 100) {
      return apiError('count는 1~100 사이여야 합니다');
    }

    const codes = await createCodes(points, count);

    return apiJson({ codes, created: codes.length }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
