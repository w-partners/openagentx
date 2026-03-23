import { query } from '../db/pool';
import { lockEscrow } from '../payment/escrow';
import { getX402Settings, buildPaymentRequirement } from './x402';
import { verifyMandate, verifyIntentScope, storeMandate } from './ap2';
import type { IntentMandate, Mandate } from './ap2';

// ---------------------------------------------------------------------------
// Protocol Router — 에이전트 프로토콜 설정에 따라 거래 경로 결정
// 지원 프로토콜: direct (DB escrow), ACP bridge, UCP, x402, Stripe
// ---------------------------------------------------------------------------

// --- Types ---

export type ProtocolType = 'direct' | 'acp' | 'ucp' | 'x402' | 'stripe';

export interface ProtocolSettings {
  agent_id: string;
  enable_direct: boolean;
  enable_acp: boolean;
  enable_ucp: boolean;
  enable_x402: boolean;
  accept_usdc: boolean;
  accept_card: boolean;
  accept_google_pay: boolean;
  allow_autonomous: boolean;
  autonomous_max_amount: number | null;
  acp_wallet_address: string | null;
  acp_agent_id: string | null;
  x402_price_per_call: number | null;
  x402_supported_tokens: string[] | null;
}

export interface JobRequest {
  service_id: string;
  buyer_id: string;
  input_data: Record<string, unknown>;
  amount: number;
  /** 클라이언트가 선호하는 프로토콜 (없으면 자동 결정) */
  preferred_protocol?: ProtocolType;
  /** 결제 수단 */
  payment_method?: 'usdc' | 'card' | 'google_pay';
  /** AP2 Mandate (자율 위임 시) */
  mandate?: Mandate;
}

export interface RouteResult {
  protocol: ProtocolType;
  /** 성공 여부 */
  success: boolean;
  /** Job ID (direct/ucp 경로) */
  job_id?: string;
  /** 402 응답 필요 (x402 경로) */
  payment_required?: {
    headers: Record<string, string>;
    requirement: unknown;
  };
  /** Stripe client_secret (card 경로) */
  stripe_client_secret?: string;
  /** ACP Job ID (acp 경로) */
  acp_job_id?: string;
  /** 오류 메시지 */
  error?: string;
}

// --- 프로토콜 설정 조회 ---

export async function getProtocolSettings(agentId: string): Promise<ProtocolSettings | null> {
  const result = await query<{
    agent_id: string;
    enable_direct: boolean;
    enable_acp: boolean;
    enable_ucp: boolean;
    enable_x402: boolean;
    accept_usdc: boolean;
    accept_card: boolean;
    accept_google_pay: boolean;
    allow_autonomous: boolean;
    autonomous_max_amount: string | null;
    acp_wallet_address: string | null;
    acp_agent_id: string | null;
    x402_price_per_call: string | null;
    x402_supported_tokens: string[] | null;
  }>(
    'SELECT * FROM agent_protocol_settings WHERE agent_id = $1',
    [agentId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    autonomous_max_amount: row.autonomous_max_amount ? parseFloat(row.autonomous_max_amount) : null,
    x402_price_per_call: row.x402_price_per_call ? parseFloat(row.x402_price_per_call) : null,
  };
}

// --- 프로토콜 결정 ---

export function determineProtocol(
  settings: ProtocolSettings,
  request: JobRequest,
): ProtocolType {
  // 1. 클라이언트 선호 프로토콜이 있고, 에이전트가 지원하면 사용
  if (request.preferred_protocol) {
    const pref = request.preferred_protocol;
    if (pref === 'direct' && settings.enable_direct) return 'direct';
    if (pref === 'acp' && settings.enable_acp) return 'acp';
    if (pref === 'ucp' && settings.enable_ucp) return 'ucp';
    if (pref === 'x402' && settings.enable_x402) return 'x402';
    if (pref === 'stripe' && settings.accept_card) return 'stripe';
  }

  // 2. 결제 수단 기반 결정
  if (request.payment_method === 'card' && settings.accept_card) return 'stripe';

  // 3. x402 마이크로페이먼트 (소액 + x402 활성)
  if (
    settings.enable_x402 &&
    settings.x402_price_per_call != null &&
    request.amount <= settings.x402_price_per_call * 2
  ) {
    return 'x402';
  }

  // 4. ACP 브릿지 (ACP 활성화 + USDC)
  if (settings.enable_acp && settings.acp_agent_id) return 'acp';

  // 5. UCP (외부 에이전트 유입)
  if (settings.enable_ucp) return 'ucp';

  // 6. 기본: 직접 거래 (DB 에스크로)
  return 'direct';
}

// --- 메인 라우터 ---

export async function routeByProtocol(
  agentId: string,
  request: JobRequest,
): Promise<RouteResult> {
  // 에이전트 프로토콜 설정 조회
  const settings = await getProtocolSettings(agentId);
  if (!settings) {
    // 설정 없으면 기본 direct
    return routeDirect(agentId, request);
  }

  // AP2 Mandate 검증 (자율 위임 요청인 경우)
  if (request.mandate) {
    const mandateResult = verifyMandate(request.mandate);
    if (!mandateResult.valid) {
      return { protocol: 'direct', success: false, error: mandateResult.error };
    }

    // Intent Mandate 범위 검증
    if (request.mandate.type === 'intent') {
      const scopeResult = verifyIntentScope(request.mandate as IntentMandate, {
        service_id: request.service_id,
        agent_id: agentId,
        amount: request.amount,
      });
      if (!scopeResult.allowed) {
        return { protocol: 'direct', success: false, error: scopeResult.error };
      }
    }
  }

  // 프로토콜 결정
  const protocol = determineProtocol(settings, request);

  switch (protocol) {
    case 'direct':
      return routeDirect(agentId, request);
    case 'x402':
      return routeX402(agentId, request, settings);
    case 'stripe':
      return routeStripe(agentId, request);
    case 'acp':
      return routeAcp(agentId, request, settings);
    case 'ucp':
      return routeDirect(agentId, request); // UCP는 진입점만 다르고 실행은 direct
    default:
      return routeDirect(agentId, request);
  }
}

// --- 개별 프로토콜 라우팅 ---

async function routeDirect(agentId: string, request: JobRequest): Promise<RouteResult> {
  try {
    // Job 생성
    const jobResult = await query<{ id: string }>(
      `INSERT INTO marketplace_jobs
         (service_id, agent_id, buyer_id, status, input_data, payment_amount, commission_rate, source)
       VALUES ($1, $2, $3, 'pending', $4, $5,
         (SELECT commission_rate FROM agents WHERE id = $2),
         'direct')
       RETURNING id`,
      [request.service_id, agentId, request.buyer_id, JSON.stringify(request.input_data), request.amount],
    );

    const jobId = jobResult.rows[0].id;

    // 에스크로 잠금
    await lockEscrow(jobId, request.buyer_id, request.amount);

    // Mandate 저장 (있는 경우)
    if (request.mandate) {
      await storeMandate(jobId, request.mandate);
    }

    return { protocol: 'direct', success: true, job_id: jobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : '직접 거래 처리 중 오류가 발생했습니다';
    return { protocol: 'direct', success: false, error: message };
  }
}

async function routeX402(
  agentId: string,
  request: JobRequest,
  settings: ProtocolSettings,
): Promise<RouteResult> {
  const pricePerCall = settings.x402_price_per_call ?? request.amount;

  // 서비스 정보 조회
  const svcResult = await query<{ name: string }>(
    'SELECT name FROM agent_services WHERE id = $1',
    [request.service_id],
  );
  const serviceName = svcResult.rows[0]?.name ?? '서비스';

  const requirement = buildPaymentRequirement({
    agentId,
    serviceId: request.service_id,
    priceUsdc: pricePerCall,
    description: `x402 마이크로결제: ${serviceName}`,
  });

  const { build402Headers } = await import('./x402');
  const headers = build402Headers(requirement);

  return {
    protocol: 'x402',
    success: true,
    payment_required: { headers, requirement },
  };
}

async function routeStripe(agentId: string, request: JobRequest): Promise<RouteResult> {
  try {
    const { createPaymentIntent } = await import('./stripe');

    // Job 생성 (pending)
    const jobResult = await query<{ id: string; commission_rate: string }>(
      `INSERT INTO marketplace_jobs
         (service_id, agent_id, buyer_id, status, input_data, payment_amount, commission_rate, source)
       VALUES ($1, $2, $3, 'pending', $4, $5,
         (SELECT commission_rate FROM agents WHERE id = $2),
         'stripe')
       RETURNING id, commission_rate`,
      [request.service_id, agentId, request.buyer_id, JSON.stringify(request.input_data), request.amount],
    );

    const jobId = jobResult.rows[0].id;
    const commissionRate = parseFloat(jobResult.rows[0].commission_rate);

    const result = await createPaymentIntent({
      jobId,
      buyerId: request.buyer_id,
      agentId,
      amount: request.amount,
      commissionRate,
    });

    return {
      protocol: 'stripe',
      success: true,
      job_id: jobId,
      stripe_client_secret: result.clientSecret,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe 결제 처리 중 오류가 발생했습니다';
    return { protocol: 'stripe', success: false, error: message };
  }
}

async function routeAcp(
  agentId: string,
  request: JobRequest,
  settings: ProtocolSettings,
): Promise<RouteResult> {
  // ACP 브릿지 — Virtuals ACP 네트워크로 Job 전달
  // 실제 ACP SDK 연동은 Phase 1 런타임에서 처리
  // 여기서는 Job 레코드만 생성하고 ACP 브릿지에 위임
  try {
    const jobResult = await query<{ id: string }>(
      `INSERT INTO marketplace_jobs
         (service_id, agent_id, buyer_id, status, input_data, payment_amount, commission_rate, source)
       VALUES ($1, $2, $3, 'pending', $4, $5,
         (SELECT commission_rate FROM agents WHERE id = $2),
         'acp')
       RETURNING id`,
      [request.service_id, agentId, request.buyer_id, JSON.stringify(request.input_data), request.amount],
    );

    return {
      protocol: 'acp',
      success: true,
      job_id: jobResult.rows[0].id,
      acp_job_id: settings.acp_agent_id ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ACP 브릿지 처리 중 오류가 발생했습니다';
    return { protocol: 'acp', success: false, error: message };
  }
}
