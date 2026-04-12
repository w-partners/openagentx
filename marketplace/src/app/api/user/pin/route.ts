import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import { query } from '@/lib/db/pool';
import { ensurePinColumns } from '@/lib/db/ensure-pin-columns';
import bcrypt from 'bcrypt';

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN은 4~6자리 숫자여야 합니다'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);
    await ensurePinColumns();

    const body = await request.json();
    const parsed = pinSchema.safeParse(body);
    if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

    const hash = await bcrypt.hash(parsed.data.pin, 12);
    await query('UPDATE users SET payment_pin = $1, pin_failed_count = 0, pin_locked_until = NULL WHERE id = $2', [hash, user.userId]);

    return apiJson({ data: { registered: true } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);
    await ensurePinColumns();

    const result = await query<{ payment_pin: string | null }>('SELECT payment_pin FROM users WHERE id = $1', [user.userId]);
    return apiJson({ data: { hasPin: !!result.rows[0]?.payment_pin } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);
    await ensurePinColumns();

    await query('UPDATE users SET payment_pin = NULL WHERE id = $1', [user.userId]);
    return apiJson({ data: { deleted: true } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
}
