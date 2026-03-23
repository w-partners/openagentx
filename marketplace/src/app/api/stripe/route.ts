import { NextRequest } from 'next/server';
import { apiJson, apiError, apiCatchError, requireAuth } from '@/lib/utils/api-response';
import {
  createConnectAccount,
  createPaymentIntent,
  verifyWebhookSignature,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleAccountUpdated,
} from '@/lib/protocols/stripe';
import { query } from '@/lib/db/pool';

/**
 * POST /api/stripe — Stripe Connect 통합 엔드포인트
 *
 * Body.action:
 * - "create-account"  → 판매자 Stripe Connect 계정 생성
 * - "create-payment"  → 구매자 PaymentIntent 생성
 * - "webhook"         → Stripe Webhook 이벤트 처리
 */
export async function POST(request: NextRequest) {
  try {
    // Webhook은 인증 없이 처리
    const contentType = request.headers.get('content-type') ?? '';
    const stripeSignature = request.headers.get('stripe-signature');

    if (stripeSignature) {
      return handleWebhook(request, stripeSignature);
    }

    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) {
      return apiError('action은 필수입니다 (create-account | create-payment)', 400);
    }

    switch (action) {
      case 'create-account':
        return handleCreateAccount(request, body);
      case 'create-payment':
        return handleCreatePayment(request, body);
      default:
        return apiError(`지원하지 않는 action입니다: ${action}`, 400);
    }
  } catch (err) {
    return apiCatchError(err, 500);
  }
}

// --- 판매자 Stripe 계정 생성 ---

async function handleCreateAccount(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const userId = requireAuth(request);
  const { agent_id } = body as { agent_id?: string };

  if (!agent_id) {
    return apiError('agent_id는 필수입니다', 400);
  }

  // 에이전트 소유권 확인
  const agentResult = await query<{ owner_id: string }>(
    'SELECT owner_id FROM agents WHERE id = $1',
    [agent_id],
  );
  if (agentResult.rows.length === 0) {
    return apiError('에이전트를 찾을 수 없습니다', 404);
  }
  if (agentResult.rows[0].owner_id !== userId) {
    return apiError('에이전트 소유자만 Stripe 계정을 연결할 수 있습니다', 403);
  }

  // 사용자 이메일 조회
  const userResult = await query<{ email: string | null }>(
    'SELECT email FROM users WHERE id = $1',
    [userId],
  );
  const email = userResult.rows[0]?.email;
  if (!email) {
    return apiError('이메일이 등록되지 않은 사용자는 Stripe 계정을 생성할 수 없습니다', 400);
  }

  const result = await createConnectAccount(agent_id as string, email);

  return apiJson({
    stripe_account_id: result.accountId,
    onboarding_url: result.onboardingUrl,
  });
}

// --- 구매자 PaymentIntent 생성 ---

async function handleCreatePayment(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const userId = requireAuth(request);
  const { job_id, agent_id, amount } = body as {
    job_id?: string;
    agent_id?: string;
    amount?: number;
  };

  if (!job_id || !agent_id || !amount) {
    return apiError('job_id, agent_id, amount는 필수입니다', 400);
  }

  // Job 소유권 확인
  const jobResult = await query<{ buyer_id: string; commission_rate: string }>(
    'SELECT buyer_id, commission_rate FROM marketplace_jobs WHERE id = $1',
    [job_id],
  );
  if (jobResult.rows.length === 0) {
    return apiError('Job을 찾을 수 없습니다', 404);
  }
  if (jobResult.rows[0].buyer_id !== userId) {
    return apiError('Job 구매자만 결제할 수 있습니다', 403);
  }

  const commissionRate = parseFloat(jobResult.rows[0].commission_rate);

  const result = await createPaymentIntent({
    jobId: job_id as string,
    buyerId: userId,
    agentId: agent_id as string,
    amount: amount as number,
    commissionRate,
  });

  return apiJson({
    payment_intent_id: result.paymentIntentId,
    client_secret: result.clientSecret,
    amount: result.amount,
    platform_fee: result.platformFee,
    seller_amount: result.sellerAmount,
  });
}

// --- Stripe Webhook 처리 ---

async function handleWebhook(request: NextRequest, signatureHeader: string) {
  const rawBody = await request.text();

  // 서명 검증
  const isValid = verifyWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    return apiError('Webhook 서명 검증 실패', 400);
  }

  const event = JSON.parse(rawBody) as {
    type: string;
    data: {
      object: {
        id: string;
        metadata?: Record<string, string>;
        // account.updated 이벤트
        charges_enabled?: boolean;
        payouts_enabled?: boolean;
      };
    };
  };

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object.metadata ?? {});
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object.metadata ?? {});
      break;
    case 'account.updated':
      await handleAccountUpdated(event.data.object.id);
      break;
    default:
      // 처리하지 않는 이벤트는 무시
      break;
  }

  return apiJson({ received: true });
}
