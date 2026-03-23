import { query, transaction } from '../db/pool';
import type { PoolClient } from 'pg';

// ---------------------------------------------------------------------------
// Stripe Connect — 카드/간편결제 멀티벤더 마켓플레이스 결제
// 판매자 Stripe 계정 연결, PaymentIntent 생성, 플랫폼 수수료 차감
// ---------------------------------------------------------------------------

// --- Types ---

/** Stripe Connect 계정 정보 */
export interface StripeConnectAccount {
  agent_id: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

/** PaymentIntent 생성 요청 */
export interface CreatePaymentIntentParams {
  jobId: string;
  buyerId: string;
  agentId: string;
  amount: number;
  currency?: string;
  commissionRate: number;
}

/** PaymentIntent 결과 */
export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  platformFee: number;
  sellerAmount: number;
}

/** Webhook 이벤트 타입 */
export type StripeWebhookEvent =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'account.updated';

// --- Stripe API 헬퍼 (환경변수 기반) ---

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY 환경변수가 설정되지 않았습니다');
  return key;
}

function getStripeWebhookSecret(): string {
  const key = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key) throw new Error('STRIPE_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다');
  return key;
}

async function stripeRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'POST',
  body?: Record<string, string>,
): Promise<T> {
  const url = `https://api.stripe.com/v1${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getStripeSecretKey()}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = { method, headers };
  if (body && method === 'POST') {
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Stripe API 오류 (${response.status}): ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

// --- Stripe Connect 계정 생성 (판매자 온보딩) ---

export async function createConnectAccount(
  agentId: string,
  email: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
  // Stripe Express 계정 생성
  const account = await stripeRequest<{ id: string }>('/accounts', 'POST', {
    type: 'express',
    email,
    'capabilities[card_payments][requested]': 'true',
    'capabilities[transfers][requested]': 'true',
    'metadata[agent_id]': agentId,
    'metadata[platform]': 'cryptointel',
  });

  // 온보딩 링크 생성
  const returnUrl = `${process.env.NEXTAUTH_URL ?? 'https://openagentx.org'}/dashboard/settings?stripe=complete`;
  const refreshUrl = `${process.env.NEXTAUTH_URL ?? 'https://openagentx.org'}/dashboard/settings?stripe=refresh`;

  const link = await stripeRequest<{ url: string }>('/account_links', 'POST', {
    account: account.id,
    type: 'account_onboarding',
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  // DB에 Stripe 계정 ID 저장
  await query(
    `UPDATE agent_protocol_settings
     SET accept_card = true,
         updated_at = NOW()
     WHERE agent_id = $1`,
    [agentId],
  );

  // metadata에 stripe 정보 저장
  await query(
    `UPDATE agents
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
       'stripe_account_id', $1::text,
       'stripe_onboarding_complete', false
     )
     WHERE id = $2`,
    [account.id, agentId],
  );

  return { accountId: account.id, onboardingUrl: link.url };
}

// --- PaymentIntent 생성 (구매자 결제) ---

export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
): Promise<PaymentIntentResult> {
  // 에이전트의 Stripe 계정 ID 조회
  const agentResult = await query<{ metadata: Record<string, unknown> | null }>(
    'SELECT metadata FROM agents WHERE id = $1',
    [params.agentId],
  );

  if (agentResult.rows.length === 0) {
    throw new Error('에이전트를 찾을 수 없습니다');
  }

  const stripeAccountId = agentResult.rows[0].metadata?.stripe_account_id as string | undefined;
  if (!stripeAccountId) {
    throw new Error('판매자의 Stripe 계정이 연결되지 않았습니다');
  }

  // 수수료 계산
  const amountCents = Math.round(params.amount * 100);
  const platformFeeCents = Math.round(amountCents * params.commissionRate / 100);

  const currency = params.currency ?? 'usd';

  // PaymentIntent 생성 (destination charge)
  const paymentIntent = await stripeRequest<{ id: string; client_secret: string }>(
    '/payment_intents',
    'POST',
    {
      amount: amountCents.toString(),
      currency,
      'payment_method_types[]': 'card',
      'transfer_data[destination]': stripeAccountId,
      application_fee_amount: platformFeeCents.toString(),
      'metadata[job_id]': params.jobId,
      'metadata[buyer_id]': params.buyerId,
      'metadata[agent_id]': params.agentId,
      'metadata[platform]': 'cryptointel',
    },
  );

  // 결제 기록
  await query(
    `INSERT INTO payments (job_id, user_id, payment_type, amount, currency, status, metadata)
     VALUES ($1, $2, 'stripe_card', $3, $4, 'pending', jsonb_build_object(
       'stripe_payment_intent_id', $5,
       'stripe_account_id', $6,
       'platform_fee_cents', $7
     ))`,
    [
      params.jobId, params.buyerId, params.amount, currency.toUpperCase(),
      paymentIntent.id, stripeAccountId, platformFeeCents,
    ],
  );

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    amount: params.amount,
    platformFee: platformFeeCents / 100,
    sellerAmount: (amountCents - platformFeeCents) / 100,
  };
}

// --- Webhook 이벤트 처리 ---

export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
): boolean {
  // Stripe webhook signature 검증 (stripe-signature 헤더)
  // 형식: t=timestamp,v1=signature
  const secret = getStripeWebhookSecret();
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const expectedSignature = signaturePart.slice(3);

  // 타임스탬프 5분 이내 확인
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  // HMAC-SHA256 검증
  const signedPayload = `${timestamp}.${payload}`;
  const crypto = globalThis.crypto ?? require('crypto');

  // Web Crypto 대신 Node.js crypto 사용
  const nodeCrypto = require('crypto') as typeof import('crypto');
  const computed = nodeCrypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return computed === expectedSignature;
}

export async function handlePaymentIntentSucceeded(metadata: {
  job_id?: string;
  buyer_id?: string;
  agent_id?: string;
}): Promise<void> {
  if (!metadata.job_id) return;

  await transaction(async (client: PoolClient) => {
    // 결제 상태 업데이트
    await client.query(
      `UPDATE payments SET status = 'completed', updated_at = NOW()
       WHERE job_id = $1 AND payment_type = 'stripe_card' AND status = 'pending'`,
      [metadata.job_id],
    );

    // Job 에스크로 설정
    await client.query(
      `UPDATE marketplace_jobs SET status = 'deposited', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [metadata.job_id],
    );
  });
}

export async function handlePaymentIntentFailed(metadata: {
  job_id?: string;
}): Promise<void> {
  if (!metadata.job_id) return;

  await query(
    `UPDATE payments SET status = 'failed', updated_at = NOW()
     WHERE job_id = $1 AND payment_type = 'stripe_card' AND status = 'pending'`,
    [metadata.job_id],
  );
}

export async function handleAccountUpdated(accountId: string): Promise<void> {
  // Stripe 계정 상태 업데이트 (온보딩 완료 등)
  // Stripe 계정에서 charges_enabled 확인
  const account = await stripeRequest<{
    charges_enabled: boolean;
    payouts_enabled: boolean;
  }>(`/accounts/${accountId}`, 'GET');

  if (account.charges_enabled) {
    await query(
      `UPDATE agents
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
         'stripe_onboarding_complete', true,
         'stripe_charges_enabled', $1,
         'stripe_payouts_enabled', $2
       )
       WHERE metadata->>'stripe_account_id' = $3`,
      [account.charges_enabled, account.payouts_enabled, accountId],
    );
  }
}
