import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CODE-${part()}-${part()}`;
}

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

    const conditions = ['1=1'];
    const values: unknown[] = [];
    let idx = 1;

    if (status && ['active', 'used'].includes(status)) {
      conditions.push(`cc.status = $${idx++}`);
      values.push(status);
    }

    const where = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query<{
        id: string;
        code: string;
        points: number;
        status: string;
        used_by: string | null;
        used_at: Date | null;
        created_at: Date;
        used_by_email: string | null;
        used_by_nickname: string | null;
      }>(
        `SELECT cc.id, cc.code, cc.points, cc.status, cc.used_by, cc.used_at, cc.created_at,
                u.email as used_by_email, u.nickname as used_by_nickname
         FROM charge_codes cc
         LEFT JOIN users u ON u.id = cc.used_by
         WHERE ${where}
         ORDER BY cc.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM charge_codes cc WHERE ${where}`,
        values,
      ),
    ]);

    return apiJson({
      codes: dataResult.rows,
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

    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let code = generateCode();
      // Retry if duplicate (unlikely but handle it)
      for (let retry = 0; retry < 3; retry++) {
        try {
          await query(
            'INSERT INTO charge_codes (code, points) VALUES ($1, $2)',
            [code, points],
          );
          codes.push(code);
          break;
        } catch {
          code = generateCode();
        }
      }
    }

    return apiJson({ codes, created: codes.length }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
