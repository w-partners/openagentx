import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { query, transaction } from '@/lib/db/pool';
import { ensurePinColumns } from '@/lib/db/ensure-pin-columns';
import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';

const chargeSchema = z.object({
  amount: z.number().min(1000, '최소 1,000원').max(1000000, '최대 1,000,000원'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN은 4~6자리 숫자'),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) return apiJson({ error: '유효하지 않은 API Key' }, 401);
    await ensurePinColumns();

    const body = await request.json();
    const parsed = chargeSchema.safeParse(body);
    if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

    const { amount, pin } = parsed.data;

    const userResult = await query<{
      id: string; payment_pin: string | null;
      pin_failed_count: number; pin_locked_until: Date | null;
      balance_usdc: string;
    }>('SELECT id, payment_pin, pin_failed_count, pin_locked_until, balance_usdc FROM users WHERE id = $1', [auth.userId]);

    if (userResult.rows.length === 0) return apiJson({ error: '사용자를 찾을 수 없습니다' }, 404);
    const user = userResult.rows[0];

    if (!user.payment_pin) return apiJson({ error: 'PIN이 등록되지 않았습니다. 사이트에서 먼저 PIN을 등록해주세요.' }, 400);

    if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.pin_locked_until).getTime() - Date.now()) / 60000);
      return apiJson({ error: `PIN이 잠겼습니다. ${remaining}분 후 다시 시도해주세요.` }, 423);
    }

    const pinValid = await bcrypt.compare(pin, user.payment_pin);
    if (!pinValid) {
      const failCount = (user.pin_failed_count || 0) + 1;
      if (failCount >= 5) {
        await query('UPDATE users SET pin_failed_count = $1, pin_locked_until = NOW() + INTERVAL \'30 minutes\' WHERE id = $2', [failCount, auth.userId]);
        return apiJson({ error: 'PIN 5회 실패. 30분간 잠금됩니다.' }, 423);
      }
      await query('UPDATE users SET pin_failed_count = $1 WHERE id = $2', [failCount, auth.userId]);
      return apiJson({ error: `PIN이 틀렸습니다. (${failCount}/5)` }, 401);
    }

    const points = Math.floor(amount * 1.10);
    const usdcAmount = amount / 1380;

    const result = await transaction(async (client: PoolClient) => {
      await client.query('UPDATE users SET pin_failed_count = 0, pin_locked_until = NULL WHERE id = $1', [auth.userId]);

      const topup = await client.query<{ id: string }>(
        `INSERT INTO topup_requests (user_id, amount, currency, points, payment_method, status)
         VALUES ($1, $2, 'KRW', $3, 'pin', 'completed') RETURNING id`,
        [auth.userId, amount, points],
      );

      await client.query('UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2', [usdcAmount, auth.userId]);

      await client.query(
        `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
         VALUES ($1, 'deposit', $2, 'USDC', 'completed', $3)`,
        [auth.userId, usdcAmount, JSON.stringify({ method: 'pin', originalAmount: amount, points })],
      );

      const bal = await client.query<{ balance_usdc: string }>('SELECT balance_usdc FROM users WHERE id = $1', [auth.userId]);

      return { topupId: topup.rows[0].id, balance: parseFloat(bal.rows[0].balance_usdc), charged: usdcAmount, points, amount };
    });

    return apiJson({ data: result });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key' } });
}
