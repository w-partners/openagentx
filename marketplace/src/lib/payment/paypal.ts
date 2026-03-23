/** PayPal REST API v2 Orders 통합 — 환경변수: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE, PAYPAL_WEBHOOK_ID */

function getConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = (process.env.PAYPAL_MODE ?? 'sandbox') as 'sandbox' | 'live';
  const webhookId = process.env.PAYPAL_WEBHOOK_ID ?? '';
  if (!clientId || !clientSecret) throw new Error('PayPal 환경변수가 설정되지 않았습니다');
  const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  return { clientId, clientSecret, baseUrl, webhookId };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const { clientId, clientSecret, baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal 토큰 발급 실패: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

async function paypalFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`PayPal API 오류 (${res.status}): ${body}`);
  return body ? (JSON.parse(body) as T) : ({} as T);
}

// Types
export interface PayPalOrder { id: string; status: string; links: Array<{ href: string; rel: string; method: string }> }
export interface PayPalCapture { id: string; status: string; purchase_units: Array<{ payments: { captures: Array<{ id: string; status: string; amount: { currency_code: string; value: string } }> } }> }
export interface PayPalRefund { id: string; status: string; amount: { currency_code: string; value: string } }
export interface PayPalWebhookEvent { id: string; event_type: string; resource: Record<string, unknown>; resource_type: string; summary: string }
export interface WebhookVerificationResult { verified: boolean; event: PayPalWebhookEvent | null }

/** PayPal 주문 생성 */
export async function createOrder(amount: number, currency: string, description: string, metadata?: Record<string, string>): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) }, description, custom_id: metadata?.jobId ?? '', reference_id: metadata?.referenceId ?? undefined }],
      application_context: { brand_name: 'OpenAgentX', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
    }),
  });
}

/** 결제 캡처 */
export async function captureOrder(orderId: string): Promise<PayPalCapture> {
  return paypalFetch<PayPalCapture>(`/v2/checkout/orders/${orderId}/capture`, { method: 'POST' });
}

/** 환불 (amount 미지정 시 전액 환불) */
export async function refundOrder(captureId: string, amount?: number, currency = 'USD'): Promise<PayPalRefund> {
  const body: Record<string, unknown> = {};
  if (amount !== undefined) body.amount = { value: amount.toFixed(2), currency_code: currency };
  return paypalFetch<PayPalRefund>(`/v2/payments/captures/${captureId}/refund`, { method: 'POST', body: JSON.stringify(body) });
}

/** Webhook 서명 검증 및 이벤트 파싱 */
export async function handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookVerificationResult> {
  const { webhookId } = getConfig();
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID가 설정되지 않았습니다');
  const verifyResult = await paypalFetch<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'] ?? '', cert_url: headers['paypal-cert-url'] ?? '',
      transmission_id: headers['paypal-transmission-id'] ?? '', transmission_sig: headers['paypal-transmission-sig'] ?? '',
      transmission_time: headers['paypal-transmission-time'] ?? '', webhook_id: webhookId, webhook_event: JSON.parse(rawBody),
    }),
  });
  const verified = verifyResult.verification_status === 'SUCCESS';
  return { verified, event: verified ? (JSON.parse(rawBody) as PayPalWebhookEvent) : null };
}

export function getClientId(): string {
  const id = process.env.PAYPAL_CLIENT_ID;
  if (!id) throw new Error('PAYPAL_CLIENT_ID가 설정되지 않았습니다');
  return id;
}

export function getMode(): 'sandbox' | 'live' {
  return (process.env.PAYPAL_MODE ?? 'sandbox') as 'sandbox' | 'live';
}
