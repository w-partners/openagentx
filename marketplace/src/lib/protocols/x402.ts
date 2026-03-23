import { ethers } from 'ethers';
import { query } from '../db/pool';
import { config } from '../config/env';

// ---------------------------------------------------------------------------
// x402 — HTTP 402 기반 마이크로페이먼트
// Coinbase 스펙: 개시(payment-required) → 서명 검증 → 정산(온체인)
// ---------------------------------------------------------------------------

// --- Constants ---

const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC
const USDC_DECIMALS = 6;

/** x402 결제 요구 헤더 정보 */
export interface X402PaymentRequirement {
  /** 결제 수신 주소 (플랫폼 지갑) */
  pay_to: string;
  /** 결제 금액 (USDC, 원시 단위) */
  amount: string;
  /** 토큰 컨트랙트 */
  token: string;
  /** 체인 */
  chain: 'base';
  /** 결제 설명 */
  description: string;
  /** 에이전트 ID */
  agent_id: string;
  /** 서비스 ID */
  service_id: string;
}

/** x402 결제 서명 페이로드 */
export interface X402PaymentPayload {
  /** 서명자 주소 */
  from: string;
  /** 수신 주소 */
  to: string;
  /** 금액 (USDC 원시 단위) */
  amount: string;
  /** 토큰 컨트랙트 */
  token: string;
  /** 타임스탬프 */
  timestamp: number;
  /** EIP-712 또는 개인 서명 */
  signature: string;
  /** 온체인 트랜잭션 해시 (정산 후) */
  tx_hash?: string;
}

// --- 에이전트 x402 설정 조회 ---

export async function getX402Settings(agentId: string): Promise<{
  enabled: boolean;
  pricePerCall: number;
  supportedTokens: string[];
} | null> {
  const result = await query<{
    enable_x402: boolean;
    x402_price_per_call: string | null;
    x402_supported_tokens: string[] | null;
  }>(
    `SELECT enable_x402, x402_price_per_call, x402_supported_tokens
     FROM agent_protocol_settings WHERE agent_id = $1`,
    [agentId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    enabled: row.enable_x402,
    pricePerCall: row.x402_price_per_call ? parseFloat(row.x402_price_per_call) : 0,
    supportedTokens: row.x402_supported_tokens ?? ['USDC'],
  };
}

// --- HTTP 402 응답 생성 ---

export function buildPaymentRequirement(params: {
  agentId: string;
  serviceId: string;
  priceUsdc: number;
  description: string;
}): X402PaymentRequirement {
  const platformWallet = new ethers.Wallet(config.PLATFORM_WALLET_PRIVATE_KEY);

  return {
    pay_to: platformWallet.address,
    amount: ethers.parseUnits(params.priceUsdc.toFixed(USDC_DECIMALS), USDC_DECIMALS).toString(),
    token: USDC_BASE_ADDRESS,
    chain: 'base',
    description: params.description,
    agent_id: params.agentId,
    service_id: params.serviceId,
  };
}

export function build402Headers(requirement: X402PaymentRequirement): Record<string, string> {
  return {
    'X-Payment-Required': 'true',
    'X-Payment-Token': requirement.token,
    'X-Payment-Amount': requirement.amount,
    'X-Payment-To': requirement.pay_to,
    'X-Payment-Chain': requirement.chain,
    'X-Payment-Agent-Id': requirement.agent_id,
    'X-Payment-Service-Id': requirement.service_id,
  };
}

// --- 결제 서명 검증 ---

/**
 * USDC 결제 서명 검증.
 * EIP-191 personal_sign 메시지 형식:
 * "x402-payment:{to}:{amount}:{token}:{timestamp}"
 */
export function verifyPaymentSignature(payload: X402PaymentPayload): {
  valid: boolean;
  signer?: string;
  error?: string;
} {
  try {
    const message = `x402-payment:${payload.to}:${payload.amount}:${payload.token}:${payload.timestamp}`;
    const recoveredAddress = ethers.verifyMessage(message, payload.signature);

    if (recoveredAddress.toLowerCase() !== payload.from.toLowerCase()) {
      return { valid: false, error: '서명자 주소가 일치하지 않습니다' };
    }

    // 타임스탬프 유효성 (5분 이내)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - payload.timestamp) > 300) {
      return { valid: false, error: '결제 타임스탬프가 만료되었습니다 (5분 초과)' };
    }

    return { valid: true, signer: recoveredAddress };
  } catch {
    return { valid: false, error: '서명 검증에 실패했습니다' };
  }
}

// --- 온체인 정산 확인 ---

/**
 * Base 체인에서 USDC 전송 트랜잭션 확인.
 * tx_hash로 receipt 조회 → Transfer 이벤트 파싱 → 금액/수신자 검증.
 */
export async function confirmOnChainSettlement(
  txHash: string,
  expectedTo: string,
  expectedAmount: string,
): Promise<{ confirmed: boolean; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(config.BASE_RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { confirmed: false, error: '트랜잭션을 찾을 수 없습니다' };
    }

    if (receipt.status !== 1) {
      return { confirmed: false, error: '트랜잭션이 실패했습니다' };
    }

    // ERC-20 Transfer(address,address,uint256) 이벤트 파싱
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === USDC_BASE_ADDRESS.toLowerCase() &&
        log.topics[0] === transferTopic,
    );

    if (!transferLog) {
      return { confirmed: false, error: 'USDC Transfer 이벤트를 찾을 수 없습니다' };
    }

    // 수신자 주소 검증 (topics[2] = to, zero-padded)
    const toAddress = ethers.getAddress('0x' + transferLog.topics[2].slice(26));
    if (toAddress.toLowerCase() !== expectedTo.toLowerCase()) {
      return { confirmed: false, error: '수신자 주소가 일치하지 않습니다' };
    }

    // 금액 검증
    const transferredAmount = BigInt(transferLog.data);
    if (transferredAmount.toString() !== expectedAmount) {
      return { confirmed: false, error: '전송 금액이 일치하지 않습니다' };
    }

    return { confirmed: true };
  } catch {
    return { confirmed: false, error: '온체인 정산 확인 중 오류가 발생했습니다' };
  }
}

// --- 결제 기록 ---

export async function recordX402Payment(params: {
  agentId: string;
  serviceId: string;
  payerAddress: string;
  amount: number;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO payments (user_id, payment_type, amount, currency, status, tx_hash, metadata)
     VALUES (
       (SELECT owner_id FROM agents WHERE id = $1),
       'x402_micropayment', $2, 'USDC', $3, $4,
       jsonb_build_object(
         'agent_id', $1, 'service_id', $5, 'payer_address', $6, 'protocol', 'x402'
       )
     )
     RETURNING id`,
    [params.agentId, params.amount, params.status, params.txHash ?? null, params.serviceId, params.payerAddress],
  );
  return result.rows[0].id;
}
