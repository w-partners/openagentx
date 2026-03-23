import { NextRequest, NextResponse } from 'next/server';
import { apiJson, apiError, apiCatchError, requireAuth } from '@/lib/utils/api-response';
import {
  createPayment,
  handleCallback,
  cancelPayment,
  resolvePayState,
  payTypeLabel,
  type FeedbackData,
} from '@/lib/payment/payapp';
import { query } from '@/lib/db/pool';
import { createPayment as dbCreatePayment } from '@/lib/db/repositories/payments';

/**
 * POST /api/payment/payapp — PayApp 결제 통합 엔드포인트
 *
 * Body.action:
 * - "create"   → 결제 요청 생성
 * - "cancel"   → 결제 취소
 * - "callback" → PayApp 피드백(콜백) 처리 (내부 전용)
 *
 * PayApp 피드백 URL은 이 엔드포인트의 ?callback=1 쿼리를 사용합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // PayApp 피드백 콜백인지 확인 (query param 또는 content-type)
    const isCallback = request.nextUrl.searchParams.get('callback') === '1';

    if (isCallback) {
      return handlePayAppCallback(request);
    }

    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) {
      return apiError('action은 필수입니다 (create | cancel)', 400);
    }

    switch (action) {
      case 'create':
        return handleCreatePayment(request, body);
      case 'cancel':
        return handleCancelPayment(request, body);
      default:
        return apiError(`지원하지 않는 action입니다: ${action}`, 400);
    }
  } catch (err) {
    return apiCatchError(err, 500);
  }
}

// ─── 결제 요청 생성 ──────────────────────────────────────────

async function handleCreatePayment(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const userId = requireAuth(request);
  const { job_id, amount, product_name, buyer_name, buyer_tel, return_url, pay_type } = body as {
    job_id?: string;
    amount?: number;
    product_name?: string;
    buyer_name?: string;
    buyer_tel?: string;
    return_url?: string;
    pay_type?: string;
  };

  if (!job_id || !amount || !product_name || !buyer_name || !buyer_tel) {
    return apiError('job_id, amount, product_name, buyer_name, buyer_tel은 필수입니다', 400);
  }

  // Job 소유권 확인
  const jobResult = await query<{ buyer_id: string; status: string }>(
    'SELECT buyer_id, status FROM marketplace_jobs WHERE id = $1',
    [job_id],
  );

  if (jobResult.rows.length === 0) {
    return apiError('Job을 찾을 수 없습니다', 404);
  }

  if (jobResult.rows[0].buyer_id !== userId) {
    return apiError('Job 구매자만 결제할 수 있습니다', 403);
  }

  // PayApp 결제 요청
  const result = await createPayment({
    orderId: job_id,
    amount,
    productName: product_name,
    buyerName: buyer_name,
    buyerTel: buyer_tel,
    returnUrl: return_url,
    payType: pay_type,
  });

  // DB에 결제 기록 생성 (pending 상태)
  const paymentId = await dbCreatePayment({
    job_id,
    user_id: userId,
    payment_type: 'deposit',
    amount,
    currency: 'KRW',
    status: 'pending',
    metadata: {
      provider: 'payapp',
      mul_no: result.mulNo,
      pay_url: result.payUrl,
      buyer_name,
      buyer_tel,
    },
  });

  return apiJson({
    payment_id: paymentId,
    mul_no: result.mulNo,
    pay_url: result.payUrl,
    qr_url: result.qrUrl,
  });
}

// ─── 결제 취소 ───────────────────────────────────────────────

async function handleCancelPayment(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const userId = requireAuth(request);
  const { mul_no, reason, partial, cancel_amount } = body as {
    mul_no?: string;
    reason?: string;
    partial?: boolean;
    cancel_amount?: number;
  };

  if (!mul_no || !reason) {
    return apiError('mul_no, reason은 필수입니다', 400);
  }

  // DB에서 해당 결제 기록 확인 (소유권 검증)
  const paymentResult = await query<{ user_id: string; id: string }>(
    `SELECT id, user_id FROM payments
     WHERE metadata->>'mul_no' = $1 AND metadata->>'provider' = 'payapp'
     ORDER BY created_at DESC LIMIT 1`,
    [mul_no],
  );

  if (paymentResult.rows.length === 0) {
    return apiError('해당 결제를 찾을 수 없습니다', 404);
  }

  if (paymentResult.rows[0].user_id !== userId) {
    return apiError('본인의 결제만 취소할 수 있습니다', 403);
  }

  await cancelPayment({
    mulNo: mul_no,
    reason,
    partial,
    cancelAmount: cancel_amount,
  });

  // DB 상태 업데이트
  await query(
    `UPDATE payments SET status = 'cancelled', metadata = metadata || $1
     WHERE id = $2`,
    [
      JSON.stringify({ cancel_reason: reason, cancelled_at: new Date().toISOString() }),
      paymentResult.rows[0].id,
    ],
  );

  return apiJson({ cancelled: true, mul_no });
}

// ─── PayApp 피드백 콜백 처리 ─────────────────────────────────

/**
 * PayApp 서버에서 결제 상태 변경 시 호출하는 콜백.
 * form-urlencoded 형식으로 POST 전송됩니다.
 *
 * 반드시 HTTP 200 + body "SUCCESS"를 반환해야 합니다.
 */
async function handlePayAppCallback(request: NextRequest) {
  try {
    const formData = await request.formData();
    const feedbackData: FeedbackData = {
      userid: (formData.get('userid') as string) ?? '',
      linkkey: (formData.get('linkkey') as string) ?? '',
      linkval: (formData.get('linkval') as string) ?? '',
      mul_no: (formData.get('mul_no') as string) ?? '',
      price: (formData.get('price') as string) ?? '',
      pay_date: (formData.get('pay_date') as string) ?? undefined,
      pay_state: (formData.get('pay_state') as string) ?? '',
      pay_type: (formData.get('pay_type') as string) ?? undefined,
      var1: (formData.get('var1') as string) ?? undefined,
      var2: (formData.get('var2') as string) ?? undefined,
      card_name: (formData.get('card_name') as string) ?? undefined,
      payauthcode: (formData.get('payauthcode') as string) ?? undefined,
      goodname: (formData.get('goodname') as string) ?? undefined,
      recvphone: (formData.get('recvphone') as string) ?? undefined,
    };

    const result = handleCallback(feedbackData);

    if (!result.valid) {
      console.error('[PayApp] 콜백 검증 실패:', {
        mul_no: feedbackData.mul_no,
        userid: feedbackData.userid,
      });
      // PayApp은 SUCCESS를 받지 못하면 재시도하므로, 검증 실패 시에도 200 반환
      return new NextResponse('SUCCESS', { status: 200 });
    }

    const { status, label } = resolvePayState(result.payState);

    // DB 결제 기록 업데이트
    const dbStatus = mapPayStateToDbStatus(status);
    await query(
      `UPDATE payments
       SET status = $1,
           metadata = metadata || $2
       WHERE metadata->>'mul_no' = $3 AND metadata->>'provider' = 'payapp'`,
      [
        dbStatus,
        JSON.stringify({
          pay_state: result.payState,
          pay_state_label: label,
          pay_date: result.payDate,
          pay_type: result.payType,
          pay_type_label: payTypeLabel(result.payType),
          card_name: result.cardName,
          auth_code: result.authCode,
          callback_at: new Date().toISOString(),
        }),
        result.mulNo,
      ],
    );

    // 결제 완료 시 Job 상태 업데이트
    if (status === 'completed' && result.orderId) {
      await query(
        `UPDATE marketplace_jobs SET status = 'deposited' WHERE id = $1 AND status = 'pending'`,
        [result.orderId],
      );
    }

    // 환불/취소 시 Job 상태 업데이트
    if ((status === 'cancelled' || status === 'refunded') && result.orderId) {
      await query(
        `UPDATE marketplace_jobs SET status = 'refunded' WHERE id = $1 AND status IN ('pending', 'deposited')`,
        [result.orderId],
      );
    }

    // PayApp 요구사항: HTTP 200 + "SUCCESS" 텍스트 반환
    return new NextResponse('SUCCESS', { status: 200 });
  } catch (err) {
    console.error('[PayApp] 콜백 처리 오류:', err);
    // 오류가 발생해도 SUCCESS 반환 (무한 재시도 방지)
    return new NextResponse('SUCCESS', { status: 200 });
  }
}

// ─── 헬퍼 ────────────────────────────────────────────────────

function mapPayStateToDbStatus(
  payappStatus: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'waiting_deposit',
): string {
  switch (payappStatus) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'cancelled';
    case 'waiting_deposit':
      return 'pending';
    case 'pending':
    default:
      return 'pending';
  }
}
