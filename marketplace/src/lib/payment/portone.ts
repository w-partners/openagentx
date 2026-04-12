/** PortOne V2 결제 통합 — REST API v2 (https://api.portone.io) */

const API_BASE = 'https://api.portone.io';

function getApiSecret(): string {
  const val = process.env.PORTONE_API_SECRET;
  if (!val) throw new Error('환경변수 PORTONE_API_SECRET이 설정되지 않았습니다');
  return val;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `PortOne ${getApiSecret()}`,
  };
}

export interface BuyerInfo { name: string; email: string; tel?: string }
export type PayMethod = 'card' | 'kakaopay' | 'tosspay' | 'naverpay' | 'paypal';

export interface PortOnePayment {
  paymentId: string;
  /** V1 호환: 기존 imp_uid 필드 (metadata에서 복원) */
  imp_uid?: string;
  merchant_uid?: string;
  amount: { total: number; paid: number; cancelled: number };
  status: string;
  method?: { type: string };
  paidAt?: string;
  currency: string;
  orderName?: string;
}

export interface PaymentResult { success: boolean; payment: PortOnePayment | null; message: string }
export interface WebhookBody {
  type: string;
  timestamp: string;
  data: {
    paymentId?: string;
    transactionId?: string;
    /** V1 하위호환 */
    imp_uid?: string;
    merchant_uid?: string;
    status?: string;
  };
}
export interface WebhookResult { paymentId: string; status: string; payment: PortOnePayment | null }
export interface CancelResult { success: boolean; cancelledAmount: number; message: string }

/** 결제 조회 (V2) */
async function getPayment(paymentId: string): Promise<PortOnePayment | null> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json as PortOnePayment;
}

/** 결제 검증 */
export async function verifyPayment(paymentId: string, expectedAmount: number): Promise<PaymentResult> {
  const payment = await getPayment(paymentId);
  if (!payment) return { success: false, payment: null, message: `결제 조회 실패: paymentId=${paymentId}` };

  const paidAmount = payment.amount?.paid ?? payment.amount?.total ?? 0;
  if (payment.status !== 'PAID') return { success: false, payment, message: `결제 미완료 (상태: ${payment.status})` };
  if (paidAmount !== expectedAmount) return { success: false, payment, message: `금액 불일치: 예상 ${expectedAmount}원, 실제 ${paidAmount}원` };
  return { success: true, payment, message: '결제 정상 확인' };
}

/** 웹훅 처리 (V2 형식) */
export async function handleWebhook(body: WebhookBody): Promise<WebhookResult> {
  // V2 웹훅: body.data.paymentId
  // V1 하위호환: body.data.imp_uid
  const paymentId = body.data?.paymentId ?? body.data?.imp_uid;
  if (!paymentId) throw new Error('웹훅 데이터 오류: paymentId 또는 imp_uid 필수');

  const payment = await getPayment(paymentId);
  const status = payment?.status ?? body.data?.status ?? 'unknown';

  return { paymentId, status, payment };
}

/** 결제 취소 (V2: amount 미지정 시 전액) */
export async function cancelPayment(paymentId: string, reason: string, amount?: number): Promise<CancelResult> {
  const payload: Record<string, unknown> = { reason };
  if (amount !== undefined) payload.amount = amount;

  const res = await fetch(`${API_BASE}/payments/${paymentId}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) return { success: false, cancelledAmount: 0, message: `취소 실패: ${json.message ?? res.statusText}` };

  const cancelledAmount = json.cancellation?.totalAmount ?? amount ?? 0;
  return { success: true, cancelledAmount, message: '결제 정상 취소' };
}
