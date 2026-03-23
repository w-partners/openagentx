import { query, transaction } from '../db/pool';
import type { PoolClient } from 'pg';

// ---------------------------------------------------------------------------
// AP2 (Agent Payments Protocol) — Mandate System
// W3C Verifiable Credentials 기반 디지털 인가/위임/분쟁 해결
// ---------------------------------------------------------------------------

// --- Types ---

/** Cart Mandate: 사용자 실시간 참여 거래 (Human-Present) */
export interface CartMandate {
  type: 'cart';
  /** 고유 mandate ID */
  id: string;
  /** 거래 상세 */
  transaction: {
    service_id: string;
    agent_id: string;
    amount: number;
    currency: string;
    description: string;
    items: Array<{ name: string; price: number; quantity: number }>;
  };
  /** 판매자(에이전트) 서명 — 이행 보증 */
  merchant_signature: string;
  /** 사용자 디바이스 키 서명 — 구매 승인 */
  user_signature: string;
  /** 서명 알고리즘 */
  signature_algorithm: 'ECDSA' | 'Ed25519';
  /** 발행 시각 */
  issued_at: string;
  /** 만료 시각 */
  expires_at: string;
}

/** Intent Mandate: 자율 에이전트 위임 (Human-Not-Present) */
export interface IntentMandate {
  type: 'intent';
  id: string;
  /** 사용자 ID */
  user_id: string;
  /** 위임 범위 */
  autonomous_range: {
    max_amount: number;
    currency: string;
    allowed_categories: string[];
    allowed_agent_ids: string[];
  };
  /** 최대 단건 금액 */
  max_amount: number;
  /** 유효 기간 (초) */
  ttl: number;
  /** 에이전트의 사용자 요청 이해도 기록 */
  prompt_playback: string;
  /** 사용자 서명 */
  user_signature: string;
  signature_algorithm: 'ECDSA' | 'Ed25519';
  issued_at: string;
  expires_at: string;
}

/** Payment Mandate: 결제 네트워크 시그널 */
export interface PaymentMandate {
  type: 'payment';
  id: string;
  /** 결제 네트워크에 전달할 시그널 */
  network_signal: {
    provider: string;
    transaction_id: string;
    amount: number;
    currency: string;
  };
  /** Human-Present / Human-Not-Present 모달리티 */
  modality: 'human_present' | 'human_not_present';
  /** 참조 mandate ID (Cart 또는 Intent) */
  reference_mandate_id: string;
  issued_at: string;
}

export type Mandate = CartMandate | IntentMandate | PaymentMandate;

/** 책임 귀속 결과 */
export type LiabilityParty = 'user' | 'agent' | 'platform';

interface ActualAction {
  service_id: string;
  agent_id: string;
  amount: number;
  category?: string;
  description?: string;
}

// --- Mandate 생성 ---

export function createCartMandate(params: {
  serviceId: string;
  agentId: string;
  amount: number;
  currency?: string;
  description: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  merchantSignature: string;
  userSignature: string;
  signatureAlgorithm?: 'ECDSA' | 'Ed25519';
  ttlSeconds?: number;
}): CartMandate {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (params.ttlSeconds ?? 3600) * 1000);

  return {
    type: 'cart',
    id: crypto.randomUUID(),
    transaction: {
      service_id: params.serviceId,
      agent_id: params.agentId,
      amount: params.amount,
      currency: params.currency ?? 'USDC',
      description: params.description,
      items: params.items,
    },
    merchant_signature: params.merchantSignature,
    user_signature: params.userSignature,
    signature_algorithm: params.signatureAlgorithm ?? 'ECDSA',
    issued_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

export function createIntentMandate(params: {
  userId: string;
  maxAmount: number;
  currency?: string;
  allowedCategories: string[];
  allowedAgentIds: string[];
  ttlSeconds: number;
  promptPlayback: string;
  userSignature: string;
  signatureAlgorithm?: 'ECDSA' | 'Ed25519';
}): IntentMandate {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.ttlSeconds * 1000);

  return {
    type: 'intent',
    id: crypto.randomUUID(),
    user_id: params.userId,
    autonomous_range: {
      max_amount: params.maxAmount,
      currency: params.currency ?? 'USDC',
      allowed_categories: params.allowedCategories,
      allowed_agent_ids: params.allowedAgentIds,
    },
    max_amount: params.maxAmount,
    ttl: params.ttlSeconds,
    prompt_playback: params.promptPlayback,
    user_signature: params.userSignature,
    signature_algorithm: params.signatureAlgorithm ?? 'ECDSA',
    issued_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

export function createPaymentMandate(params: {
  provider: string;
  transactionId: string;
  amount: number;
  currency?: string;
  modality: 'human_present' | 'human_not_present';
  referenceMandateId: string;
}): PaymentMandate {
  return {
    type: 'payment',
    id: crypto.randomUUID(),
    network_signal: {
      provider: params.provider,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency ?? 'USDC',
    },
    modality: params.modality,
    reference_mandate_id: params.referenceMandateId,
    issued_at: new Date().toISOString(),
  };
}

// --- Mandate 검증 ---

export function verifyMandate(mandate: Mandate): { valid: boolean; error?: string } {
  // 공통: 만료 체크
  if ('expires_at' in mandate) {
    if (new Date(mandate.expires_at) < new Date()) {
      return { valid: false, error: 'Mandate가 만료되었습니다' };
    }
  }

  if (mandate.type === 'cart') {
    if (!mandate.merchant_signature || !mandate.user_signature) {
      return { valid: false, error: 'Cart Mandate에는 판매자와 사용자 서명이 모두 필요합니다' };
    }
    if (mandate.transaction.amount <= 0) {
      return { valid: false, error: '거래 금액은 0보다 커야 합니다' };
    }
  }

  if (mandate.type === 'intent') {
    if (!mandate.user_signature) {
      return { valid: false, error: 'Intent Mandate에는 사용자 서명이 필요합니다' };
    }
    if (mandate.max_amount <= 0) {
      return { valid: false, error: '최대 위임 금액은 0보다 커야 합니다' };
    }
    if (mandate.ttl <= 0) {
      return { valid: false, error: 'TTL은 0보다 커야 합니다' };
    }
  }

  if (mandate.type === 'payment') {
    if (!mandate.reference_mandate_id) {
      return { valid: false, error: 'Payment Mandate에는 참조 mandate ID가 필요합니다' };
    }
  }

  return { valid: true };
}

/** Intent Mandate 범위 내 실행인지 검증 */
export function verifyIntentScope(
  mandate: IntentMandate,
  action: ActualAction,
): { allowed: boolean; error?: string } {
  if (action.amount > mandate.max_amount) {
    return { allowed: false, error: `금액 ${action.amount}이(가) 최대 위임 금액 ${mandate.max_amount}을(를) 초과합니다` };
  }

  if (
    mandate.autonomous_range.allowed_agent_ids.length > 0 &&
    !mandate.autonomous_range.allowed_agent_ids.includes(action.agent_id)
  ) {
    return { allowed: false, error: '허용되지 않은 에이전트입니다' };
  }

  if (
    action.category &&
    mandate.autonomous_range.allowed_categories.length > 0 &&
    !mandate.autonomous_range.allowed_categories.includes(action.category)
  ) {
    return { allowed: false, error: '허용되지 않은 카테고리입니다' };
  }

  return { allowed: true };
}

// --- Mandate 저장/조회 (marketplace_jobs.metadata JSONB) ---

export async function storeMandate(jobId: string, mandate: Mandate): Promise<void> {
  await query(
    `UPDATE marketplace_jobs
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('ap2_mandate', $1::jsonb)
     WHERE id = $2`,
    [JSON.stringify(mandate), jobId],
  );
}

export async function getMandateByJobId(jobId: string): Promise<Mandate | null> {
  const result = await query<{ metadata: Record<string, unknown> | null }>(
    'SELECT metadata FROM marketplace_jobs WHERE id = $1',
    [jobId],
  );
  if (result.rows.length === 0 || !result.rows[0].metadata) return null;
  const meta = result.rows[0].metadata;
  return (meta.ap2_mandate as Mandate) ?? null;
}

// --- 분쟁 해결: 책임 귀속 ---

/**
 * AP2 분쟁 해결 프레임워크에 따른 책임 귀속 결정.
 *
 * - 자체 오용 (사용자 서명 있음): 사용자 책임
 * - 에이전트 오선택 (Cart Mandate, 범위 내): 사용자 책임
 * - 에이전트 오선택 (Intent Mandate, 범위 초과): 에이전트 책임
 * - 플랫폼 시스템 오류: 플랫폼 책임
 */
export function determineLiability(
  mandate: Mandate,
  actualAction: ActualAction,
): LiabilityParty {
  // Cart Mandate: 사용자가 명시적으로 승인한 거래
  if (mandate.type === 'cart') {
    const tx = mandate.transaction;
    // 거래 내용이 mandate와 일치 → 사용자 책임 (자체 오용 또는 승인된 선택)
    if (
      tx.service_id === actualAction.service_id &&
      tx.agent_id === actualAction.agent_id &&
      tx.amount === actualAction.amount
    ) {
      return 'user';
    }
    // 거래 내용 불일치 → 플랫폼 책임 (시스템이 잘못 실행)
    return 'platform';
  }

  // Intent Mandate: 자율 위임
  if (mandate.type === 'intent') {
    const scope = verifyIntentScope(mandate, actualAction);
    if (scope.allowed) {
      // 위임 범위 내 실행 → 사용자 책임 (승인된 자율 행동)
      return 'user';
    }
    // 위임 범위 초과 → 에이전트 책임 (미승인 행동)
    return 'agent';
  }

  // Payment Mandate 단독으로는 분쟁 해결 불가 → 플랫폼이 조사
  return 'platform';
}

/** 분쟁 시 mandate 증거를 dispute 레코드에 첨부 */
export async function attachMandateToDispute(
  disputeId: string,
  jobId: string,
): Promise<boolean> {
  const mandate = await getMandateByJobId(jobId);
  if (!mandate) return false;

  await query(
    `UPDATE disputes
     SET reason = reason || E'\n\n--- AP2 Mandate 증거 ---\n' || $1
     WHERE id = $2`,
    [JSON.stringify(mandate, null, 2), disputeId],
  );
  return true;
}
