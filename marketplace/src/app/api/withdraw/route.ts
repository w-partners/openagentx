import { NextRequest } from 'next/server';
import { apiJson, apiCatchError, parsePagination } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import { query, transaction } from '@/lib/db/pool';
import type { PoolClient } from 'pg';

/**
 * POST /api/withdraw
 * 출금 요청 생성
 * body: { amount, method, bankName, accountNumber, accountHolder }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const body = await request.json();
    const { amount, method = 'bank_transfer', bankName, accountNumber, accountHolder } = body as {
      amount?: number;
      method?: string;
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
    };

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return apiJson({ error: '유효한 출금 금액이 필요합니다' }, 400);
    }

    if (method === 'bank_transfer') {
      if (!bankName) return apiJson({ error: '은행명이 필요합니다' }, 400);
      if (!accountNumber) return apiJson({ error: '계좌번호가 필요합니다' }, 400);
      if (!accountHolder) return apiJson({ error: '예금주가 필요합니다' }, 400);
    }

    // 트랜잭션: 잔액 차감 + 출금 요청 생성
    const withdrawal = await transaction(async (client: PoolClient) => {
      // 잔액 차감 (홀드)
      const deductResult = await client.query(
        'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING balance_usdc',
        [amount, user.userId],
      );
      if (deductResult.rowCount === 0) {
        throw new Error('잔액이 부족합니다');
      }

      // withdrawals 레코드 생성
      const withdrawalResult = await client.query<{
        id: string;
        status: string;
        created_at: Date;
      }>(
        `INSERT INTO withdrawals (user_id, amount, currency, method, bank_name, account_number, account_holder, status)
         VALUES ($1, $2, 'USDC', $3, $4, $5, $6, 'pending')
         RETURNING id, status, created_at`,
        [user.userId, amount, method, bankName ?? null, accountNumber ?? null, accountHolder ?? null],
      );

      const newBalance = parseFloat(deductResult.rows[0].balance_usdc);

      return {
        id: withdrawalResult.rows[0].id,
        amount,
        method,
        status: withdrawalResult.rows[0].status,
        balance: newBalance,
        createdAt: withdrawalResult.rows[0].created_at,
      };
    });

    return apiJson({ data: withdrawal }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === '잔액이 부족합니다') {
      return apiJson({ error: msg }, 402);
    }
    return apiCatchError(err, 500);
  }
}

/**
 * GET /api/withdraw
 * 출금 내역 조회
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { limit, offset } = parsePagination(request.nextUrl.searchParams);

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT id, amount, currency, method, bank_name, account_number, account_holder,
                status, admin_note, processed_at, created_at
         FROM withdrawals
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [user.userId, limit, offset],
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM withdrawals WHERE user_id = $1',
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
