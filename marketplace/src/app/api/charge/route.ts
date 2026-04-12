import { NextRequest } from 'next/server';
import { apiJson, apiCatchError, parsePagination } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import { query, transaction } from '@/lib/db/pool';
import type { PoolClient } from 'pg';

/**
 * POST /api/charge
 * PortOne 결제 완료 후 포인트 충전 처리
 * body: { paymentId, amount, currency }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const body = await request.json();
    const { paymentId, amount, currency = 'KRW' } = body as {
      paymentId?: string;
      amount?: number;
      currency?: string;
    };

    if (!paymentId || typeof paymentId !== 'string') {
      return apiJson({ error: 'paymentId가 필요합니다' }, 400);
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return apiJson({ error: '유효한 amount가 필요합니다' }, 400);
    }

    // PortOne V2 결제 검증
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (portoneApiSecret) {
      const verifyRes = await fetch(
        `https://api.portone.io/payments/${paymentId}`,
        {
          headers: { Authorization: `PortOne ${portoneApiSecret}` },
        },
      );
      if (verifyRes.ok) {
        const payment = await verifyRes.json();
        if (!payment || payment.status !== 'PAID') {
          return apiJson({ error: '결제가 완료되지 않았습니다' }, 400);
        }
        const paidAmount = payment.amount?.paid ?? payment.amount?.total ?? 0;
        if (paidAmount !== amount) {
          return apiJson({ error: '결제 금액이 일치하지 않습니다' }, 400);
        }
      }
    }

    // 환율 변환: KRW → USDC (포인트 = 1:1)
    const exchangeRate = currency === 'KRW' ? 1380 : 1; // 1 USDC = 1380 KRW
    const usdcAmount = currency === 'KRW' ? amount / exchangeRate : amount;
    const points = Math.floor(amount); // 포인트 = 원화 그대로

    // 트랜잭션: topup_request 생성 + 잔액 증가 + payment 기록
    const result = await transaction(async (client: PoolClient) => {
      // 중복 결제 방지
      const dup = await client.query(
        'SELECT id FROM topup_requests WHERE payment_id = $1',
        [paymentId],
      );
      if (dup.rows.length > 0) {
        throw new Error('이미 처리된 결제입니다');
      }

      // topup_requests 레코드 생성
      const topupResult = await client.query<{ id: string }>(
        `INSERT INTO topup_requests (user_id, amount, currency, points, payment_method, payment_id, status)
         VALUES ($1, $2, $3, $4, 'card', $5, 'completed')
         RETURNING id`,
        [user.userId, amount, currency, points, paymentId],
      );

      // 잔액 증가
      await client.query(
        'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
        [usdcAmount, user.userId],
      );

      // payments 레코드 생성
      await client.query(
        `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
         VALUES ($1, 'deposit', $2, $3, 'completed', $4)`,
        [
          user.userId,
          usdcAmount,
          'USDC',
          JSON.stringify({ paymentId, originalAmount: amount, originalCurrency: currency, points }),
        ],
      );

      // 최신 잔액 조회
      const balanceRes = await client.query<{ balance_usdc: string }>(
        'SELECT balance_usdc FROM users WHERE id = $1',
        [user.userId],
      );

      return {
        topupId: topupResult.rows[0].id,
        balance: parseFloat(balanceRes.rows[0].balance_usdc),
        charged: usdcAmount,
        points,
      };
    });

    return apiJson({ data: result }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === '이미 처리된 결제입니다') {
      return apiJson({ error: msg }, 409);
    }
    return apiCatchError(err, 500);
  }
}

/**
 * GET /api/charge
 * 충전 내역 조회
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { limit, offset } = parsePagination(request.nextUrl.searchParams);

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT id, amount, currency, points, payment_method, payment_id, status, created_at
         FROM topup_requests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [user.userId, limit, offset],
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM topup_requests WHERE user_id = $1',
        [user.userId],
      ),
    ]);

    return apiJson({
      data: dataResult.rows,
      meta: { total: parseInt(countResult.rows[0].count, 10), limit, offset },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
