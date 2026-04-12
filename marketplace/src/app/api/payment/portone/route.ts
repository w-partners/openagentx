import { NextRequest } from 'next/server';
import { apiJson, apiError, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';
import { verifyPayment, handleWebhook, cancelPayment } from '@/lib/payment/portone';
import type { WebhookBody } from '@/lib/payment/portone';
import { query } from '@/lib/db/pool';

/**
 * POST /api/payment/portone
 * action: "verify" | "cancel" | (V2 웹훅: type 필드 존재)
 * V1 하위호환: action 없이 imp_uid+status도 웹훅으로 처리
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    // V2 웹훅: type 필드 존재
    if (!action && body.type) return handleWebhookReq(body as WebhookBody);
    // V1 하위호환 웹훅: imp_uid + status
    if (!action && body.imp_uid && body.status) {
      return handleWebhookReq({
        type: 'Transaction.Paid',
        timestamp: new Date().toISOString(),
        data: { paymentId: body.imp_uid, imp_uid: body.imp_uid, merchant_uid: body.merchant_uid, status: body.status },
      });
    }
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
  // V2: paymentId 기반, V1 하위호환: imp_uid도 허용
  const paymentId = (body.paymentId ?? body.imp_uid) as string | undefined;
  const expectedAmount = body.expected_amount as number | undefined;
  if (!paymentId || !expectedAmount) return apiError('paymentId(또는 imp_uid), expected_amount 필수', 400);

  const result = await verifyPayment(paymentId, expectedAmount);
  if (!result.success) return apiJson({ error: result.message, payment: result.payment }, 400);

  const paidAmount = result.payment?.amount?.paid ?? result.payment?.amount?.total ?? expectedAmount;
  const payMethodType = result.payment?.method?.type ?? 'unknown';

  await query(
    `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
     VALUES ($1, 'portone', $2, 'KRW', 'completed', $3) ON CONFLICT DO NOTHING`,
    [userId, paidAmount, JSON.stringify({
      paymentId,
      pay_method: payMethodType,
      paidAt: result.payment?.paidAt,
      // V1 하위호환 필드
      imp_uid: body.imp_uid ?? paymentId,
      merchant_uid: body.merchant_uid ?? paymentId,
    })],
  );
  return apiJson({ data: { verified: true, paymentId, amount: paidAmount, pay_method: payMethodType } });
}

async function handleCancel(request: NextRequest, body: Record<string, unknown>) {
  const userId = requireAuth(request);
  // V2: paymentId 기반, V1 하위호환: imp_uid도 허용
  const paymentId = (body.paymentId ?? body.imp_uid) as string | undefined;
  const { amount, reason } = body as { amount?: number; reason?: string };
  if (!paymentId) return apiError('paymentId(또는 imp_uid) 필수', 400);

  const result = await cancelPayment(paymentId, reason ?? '사용자 요청 취소', amount);
  if (!result.success) return apiJson({ error: result.message }, 400);

  await query(
    `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata) VALUES ($1, 'portone_cancel', $2, 'KRW', 'completed', $3)`,
    [userId, result.cancelledAmount, JSON.stringify({ paymentId, reason })],
  );
  return apiJson({ data: { cancelled: true, paymentId, cancelled_amount: result.cancelledAmount } });
}

async function handleWebhookReq(body: WebhookBody) {
  const result = await handleWebhook(body);

  if (result.payment && result.status === 'PAID') {
    // V2 paymentId로 먼저 시도, 없으면 V1 imp_uid 호환
    await query(
      `UPDATE payments SET status = 'completed' WHERE (metadata->>'paymentId' = $1 OR metadata->>'imp_uid' = $1) AND status != 'completed'`,
      [result.paymentId],
    );
  } else if (result.status === 'CANCELLED') {
    await query(
      `UPDATE payments SET status = 'cancelled' WHERE (metadata->>'paymentId' = $1 OR metadata->>'imp_uid' = $1)`,
      [result.paymentId],
    );
  }
  return apiJson({ received: true });
}
