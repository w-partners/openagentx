import { NextRequest } from 'next/server';
import { apiJson, apiError, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';
import { createOrder, captureOrder, refundOrder, handleWebhook, getClientId, getMode } from '@/lib/payment/paypal';
import { query } from '@/lib/db/pool';

/** POST /api/payment/paypal — PayPal 통합 (create-order | capture | refund | config | webhook) */
export async function POST(request: NextRequest) {
  try {
    // Webhook: PayPal 헤더로 감지
    if (request.headers.get('paypal-transmission-id')) return handleWebhookReq(request);

    const body = await request.json();
    const { action } = body as { action?: string };
    if (!action) return apiError('action은 필수입니다 (create-order | capture | refund | config)', 400);

    switch (action) {
      case 'create-order': return handleCreate(request, body);
      case 'capture': return handleCapture(request, body);
      case 'refund': return handleRefund(request, body);
      case 'config': return apiJson({ data: { client_id: getClientId(), mode: getMode() } });
      default: return apiError(`지원하지 않는 action입니다: ${action}`, 400);
    }
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}

async function handleCreate(request: NextRequest, body: Record<string, unknown>) {
  const userId = requireAuth(request);
  const { job_id, amount, currency, description } = body as { job_id?: string; amount?: number; currency?: string; description?: string };
  if (!amount || amount <= 0) return apiError('유효한 amount가 필요합니다', 400);

  if (job_id) {
    const r = await query<{ buyer_id: string }>('SELECT buyer_id FROM marketplace_jobs WHERE id = $1', [job_id]);
    if (r.rows.length === 0) return apiError('Job을 찾을 수 없습니다', 404);
    if (r.rows[0].buyer_id !== userId) return apiError('Job 구매자만 결제할 수 있습니다', 403);
  }

  const cur = currency ?? 'USD';
  const order = await createOrder(amount, cur, description ?? 'OpenAgentX 결제', { jobId: job_id ?? '', referenceId: userId });
  await query(
    `INSERT INTO payments (user_id, job_id, payment_type, amount, currency, status, external_id, provider) VALUES ($1, $2, 'paypal_order', $3, $4, 'pending', $5, 'paypal')`,
    [userId, job_id ?? null, amount, cur, order.id],
  );
  const approveLink = order.links.find((l) => l.rel === 'approve');
  return apiJson({ data: { order_id: order.id, status: order.status, approve_url: approveLink?.href ?? null } }, 201);
}

async function handleCapture(request: NextRequest, body: Record<string, unknown>) {
  const userId = requireAuth(request);
  const { order_id } = body as { order_id?: string };
  if (!order_id) return apiError('order_id는 필수입니다', 400);

  const pr = await query<{ user_id: string; amount: string }>(
    `SELECT user_id, amount FROM payments WHERE external_id = $1 AND provider = 'paypal' AND status = 'pending'`, [order_id],
  );
  if (pr.rows.length === 0) return apiError('결제 정보를 찾을 수 없습니다', 404);
  if (pr.rows[0].user_id !== userId) return apiError('결제 소유자만 캡처할 수 있습니다', 403);

  const capture = await captureOrder(order_id);
  const cd = capture.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = cd?.id ?? '';
  const captureStatus = cd?.status ?? capture.status;
  const newStatus = captureStatus === 'COMPLETED' ? 'completed' : 'processing';

  await query(`UPDATE payments SET status = $1, capture_id = $2, updated_at = NOW() WHERE external_id = $3 AND provider = 'paypal'`, [newStatus, captureId, order_id]);
  if (captureStatus === 'COMPLETED') {
    await query('UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2', [parseFloat(pr.rows[0].amount), userId]);
  }
  return apiJson({ data: { order_id, capture_id: captureId, status: captureStatus } });
}

async function handleRefund(request: NextRequest, body: Record<string, unknown>) {
  const userId = requireAuth(request);
  const { capture_id, amount, currency } = body as { capture_id?: string; amount?: number; currency?: string };
  if (!capture_id) return apiError('capture_id는 필수입니다', 400);

  const pr = await query<{ user_id: string }>(`SELECT user_id FROM payments WHERE capture_id = $1 AND provider = 'paypal' AND status = 'completed'`, [capture_id]);
  if (pr.rows.length === 0) return apiError('캡처된 결제를 찾을 수 없습니다', 404);
  if (pr.rows[0].user_id !== userId) return apiError('결제 소유자만 환불할 수 있습니다', 403);

  const refund = await refundOrder(capture_id, amount, currency ?? 'USD');
  await query(`UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE capture_id = $1 AND provider = 'paypal'`, [capture_id]);
  return apiJson({ data: { refund_id: refund.id, status: refund.status, amount: refund.amount } });
}

async function handleWebhookReq(request: NextRequest) {
  const rawBody = await request.text();
  const hdr: Record<string, string> = {};
  for (const k of ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']) {
    hdr[k] = request.headers.get(k) ?? '';
  }
  const { verified, event } = await handleWebhook(rawBody, hdr);
  if (!verified || !event) return apiError('Webhook 서명 검증 실패', 400);

  const resourceId = (event.resource as { id?: string }).id;
  if (!resourceId) return apiJson({ received: true });

  const statusMap: Record<string, { col: string; status: string }> = {
    'CHECKOUT.ORDER.APPROVED': { col: 'external_id', status: 'approved' },
    'PAYMENT.CAPTURE.COMPLETED': { col: 'capture_id', status: 'completed' },
    'PAYMENT.CAPTURE.REFUNDED': { col: 'capture_id', status: 'refunded' },
    'PAYMENT.CAPTURE.DENIED': { col: 'capture_id', status: 'failed' },
  };
  const mapping = statusMap[event.event_type];
  if (mapping) {
    await query(`UPDATE payments SET status = $1, updated_at = NOW() WHERE ${mapping.col} = $2 AND provider = 'paypal'`, [mapping.status, resourceId]);
  }
  return apiJson({ received: true });
}
