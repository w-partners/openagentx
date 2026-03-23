import { NextRequest } from 'next/server';
import * as paymentsRepo from '@/lib/db/repositories/payments';
import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, toErrorMessage } from '@/lib/utils/constants';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';

const depositSchema = z.object({
  action: z.literal('deposit'),
  amount: z.number().positive().max(1_000_000),
  tx_hash: z.string().optional(),
});

const withdrawSchema = z.object({
  action: z.literal('withdraw'),
  amount: z.number().positive().max(1_000_000),
});

const historySchema = z.object({
  action: z.literal('history'),
  type: z.enum(['deposit', 'withdrawal', 'job_payment', 'settlement', 'refund']).optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  offset: z.number().int().min(0).optional(),
});

// POST /api/payments — action-based routing (deposit, withdraw, history)
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const body = await request.json();
    const action = body.action as string;

    switch (action) {
      case 'deposit': {
        const parsed = depositSchema.safeParse(body);
        if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

        const paymentId = await paymentsRepo.deposit(userId, parsed.data.amount, parsed.data.tx_hash);
        const balance = await paymentsRepo.getBalance(userId);
        return apiJson({ data: { paymentId, balance: balance.balance } }, 201);
      }

      case 'withdraw': {
        const parsed = withdrawSchema.safeParse(body);
        if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

        try {
          const paymentId = await paymentsRepo.withdraw(userId, parsed.data.amount);
          const balance = await paymentsRepo.getBalance(userId);
          return apiJson({ data: { paymentId, balance: balance.balance } }, 200);
        } catch (err) {
          const message = toErrorMessage(err);
          const status = message.includes('잔액') ? 402 : 400;
          return apiJson({ error: message }, status);
        }
      }

      case 'history': {
        const parsed = historySchema.safeParse(body);
        if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

        const results = await paymentsRepo.findByUser(userId, {
          type: parsed.data.type,
          limit: parsed.data.limit ?? DEFAULT_PAGE_SIZE,
          offset: parsed.data.offset ?? 0,
        });
        return apiJson({
          data: results.payments,
          meta: { total: results.total },
        });
      }

      default:
        return apiJson({ error: '알 수 없는 액션입니다. deposit, withdraw, history 중 선택하세요.' }, 400);
    }
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}

// GET /api/payments — Payment history with balance summary
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const { searchParams } = request.nextUrl;
    const { limit, offset } = parsePagination(searchParams);

    const [balance, history] = await Promise.all([
      paymentsRepo.getBalance(userId),
      paymentsRepo.getHistory(userId, { limit, offset }),
    ]);

    return apiJson({
      data: {
        balance,
        payments: history.payments,
      },
      meta: { total: history.total, limit, offset },
    });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}
