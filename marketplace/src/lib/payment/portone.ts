/** PortOne (아임포트) 결제 통합 — REST API v1 (https://api.iamport.kr) */

const API_BASE = 'https://api.iamport.kr';

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`환경변수 ${key}가 설정되지 않았습니다`);
  return val;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const res = await fetch(`${API_BASE}/users/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imp_key: getEnv('PORTONE_IMP_KEY'), imp_secret: getEnv('PORTONE_IMP_SECRET') }),
  });
  const json = (await res.json()) as { code: number; message: string; response: { access_token: string; expired_at: number } | null };
  if (json.code !== 0 || !json.response) throw new Error(`포트원 인증 실패: ${json.message}`);
  cachedToken = { token: json.response.access_token, expiresAt: json.response.expired_at * 1000 };
  return cachedToken.token;
}

export interface BuyerInfo { name: string; email: string; tel?: string }
export type PayMethod = 'card' | 'kakaopay' | 'tosspay' | 'naverpay' | 'paypal';

export interface PortOnePayment {
  imp_uid: string; merchant_uid: string; amount: number;
  status: string; pay_method: string; paid_at: number; cancel_amount: number;
}
export interface PaymentResult { success: boolean; payment: PortOnePayment | null; message: string }
export interface WebhookBody { imp_uid: string; merchant_uid: string; status: string }
export interface WebhookResult { impUid: string; merchantUid: string; status: string; payment: PortOnePayment | null }
export interface CancelResult { success: boolean; cancelledAmount: number; message: string }

/** 결제 검증 */
export async function verifyPayment(impUid: string, expectedAmount: number): Promise<PaymentResult> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/payments/${impUid}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json()) as { code: number; message: string; response: PortOnePayment | null };
  if (json.code !== 0 || !json.response) return { success: false, payment: null, message: `결제 조회 실패: ${json.message}` };
  const payment = json.response;
  if (payment.status !== 'paid') return { success: false, payment, message: `결제 미완료 (상태: ${payment.status})` };
  if (payment.amount !== expectedAmount) return { success: false, payment, message: `금액 불일치: 예상 ${expectedAmount}원, 실제 ${payment.amount}원` };
  return { success: true, payment, message: '결제 정상 확인' };
}

/** 웹훅 처리 */
export async function handleWebhook(body: WebhookBody): Promise<WebhookResult> {
  const { imp_uid, merchant_uid, status } = body;
  if (!imp_uid || !merchant_uid) throw new Error('웹훅 데이터 오류: imp_uid, merchant_uid 필수');
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/payments/${imp_uid}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json()) as { code: number; message: string; response: PortOnePayment | null };
  return { impUid: imp_uid, merchantUid: merchant_uid, status, payment: json.response ?? null };
}

/** 결제 취소 (amount 미지정 시 전액) */
export async function cancelPayment(impUid: string, reason: string, amount?: number): Promise<CancelResult> {
  const token = await getAccessToken();
  const payload: Record<string, unknown> = { imp_uid: impUid, reason };
  if (amount !== undefined) payload.amount = amount;
  const res = await fetch(`${API_BASE}/payments/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { code: number; message: string; response: { cancel_amount: number } | null };
  if (json.code !== 0 || !json.response) return { success: false, cancelledAmount: 0, message: `취소 실패: ${json.message}` };
  return { success: true, cancelledAmount: json.response.cancel_amount, message: '결제 정상 취소' };
}
