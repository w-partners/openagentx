import { NextRequest } from 'next/server';
import { apiJson, apiError, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';
import { verifyPayment, handleWebhook, cancelPayment } from '@/lib/payment/portone';
import type { WebhookBody } from '@/lib/payment/portone';
import { query } from '@/lib/db/pool';

/**
 * POST /api/payment/portone
 * action: "verify" | "cancel" | (웹훅: action 없이 imp_uid+status)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    // 웹훅: action 없이 imp_uid + status
    if (!action && body.imp_uid && body.status) return handleWebhookReq(body as WebhookBody);
    if (!action) return apiError('action 필수 (verify | cancel)', 400);

    switch (action) {
      case 'verify': return handleVerify(request, body);
      case 'cancel': return handleCancel(request, body);
      default: return apiError(`지원하지 않는 action: ${action}`, 400);
    }
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}

async function handleVerify(request: NextRequest, body: Record<string, unknown>) {
  const userId = requireAuth(request);
  const { imp_uid, merchant_uid, expected_amount } = body as { imp_uid?: string; merchant_uid?: string; expected_amount?: number };
  if (!imp_uid || !merchant_uid || !expected_amount) return apiError('imp_uid, merchant_uid, expected_amount 필수', 400);

  const result = await verifyPayment(imp_uid, expected_amount);
  if (!result.success) return apiJson({ error: result.message, payment: result.payment }, 400);

  await query(
    `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
     VALUES ($1, 'portone', $2, 'KRW', 'completed', $3) ON CONFLICT DO NOTHING`,
    [userId, expected_amount, JSON.stringify({ imp_uid, merchant_uid, pay_method: result.payment?.pay_method, paid_at: result.payment?.paid_at })],
  );
  return apiJson({ data: { verified: true, imp_uid, merchant_uid, amount: result.payment?.amount, pay_method: result.payment?.pay_method } });
}

async function handleCancel(request: NextRequest, body: Record<string, unknown>) {
  const userId = requireAuth(request);
  const { imp_uid, amount, reason } = body as { imp_uid?: string; amount?: number; reason?: string };
  if (!imp_uid) return apiError('imp_uid 필수', 400);

  const result = await cancelPayment(imp_uid, reason ?? '사용자 요청 취소', amount);
  if (!result.success) return apiJson({ error: result.message }, 400);

  await query(
    `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata) VALUES ($1, 'portone_cancel', $2, 'KRW', 'completed', $3)`,
    [userId, result.cancelledAmount, JSON.stringify({ imp_uid, reason })],
  );
  return apiJson({ data: { cancelled: true, imp_uid, cancelled_amount: result.cancelledAmount } });
}

async function handleWebhookReq(body: WebhookBody) {
  const result = await handleWebhook(body);
  if (result.payment && result.status === 'paid') {
    await query(`UPDATE payments SET status = 'completed' WHERE metadata->>'imp_uid' = $1 AND status != 'completed'`, [result.impUid]);
  } else if (result.status === 'cancelled') {
    await query(`UPDATE payments SET status = 'cancelled' WHERE metadata->>'imp_uid' = $1`, [result.impUid]);
  }
  return apiJson({ received: true });
}
