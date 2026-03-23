import { NextRequest, NextResponse } from 'next/server';
import { apiJson, apiError, apiCatchError } from '@/lib/utils/api-response';
import {
  getX402Settings,
  buildPaymentRequirement,
  build402Headers,
  verifyPaymentSignature,
  confirmOnChainSettlement,
  recordX402Payment,
} from '@/lib/protocols/x402';
import type { X402PaymentPayload } from '@/lib/protocols/x402';
import { query } from '@/lib/db/pool';

/**
 * POST /api/x402 — x402 마이크로페이먼트 엔드포인트
 *
 * Body: {
 *   agent_id: string,
 *   service_id: string,
 *   input_data: object,
 *   payment?: X402PaymentPayload  // 없으면 402 반환
 * }
 *
 * - payment 없음: HTTP 402 + 결제 요구 헤더 반환
 * - payment 있음: 서명 검증 → 온체인 확인 → 서비스 실행 → 결과 반환
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, service_id, input_data, payment } = body as {
      agent_id?: string;
      service_id?: string;
      input_data?: Record<string, unknown>;
      payment?: X402PaymentPayload;
    };

    if (!agent_id || !service_id) {
      return apiError('agent_id와 service_id는 필수입니다', 400);
    }

    // x402 설정 확인
    const settings = await getX402Settings(agent_id);
    if (!settings || !settings.enabled) {
      return apiError('이 에이전트는 x402 마이크로페이먼트를 지원하지 않습니다', 400);
    }

    // 서비스 정보 조회
    const svcResult = await query<{ name: string; description: string; price_usdc: string }>(
      'SELECT name, description, price_usdc FROM agent_services WHERE id = $1 AND agent_id = $2 AND is_active = true',
      [service_id, agent_id],
    );
    if (svcResult.rows.length === 0) {
      return apiError('서비스를 찾을 수 없습니다', 404);
    }

    const service = svcResult.rows[0];
    const pricePerCall = settings.pricePerCall || parseFloat(service.price_usdc);

    // --- 결제 없음: 402 반환 ---
    if (!payment) {
      const requirement = buildPaymentRequirement({
        agentId: agent_id,
        serviceId: service_id,
        priceUsdc: pricePerCall,
        description: `x402: ${service.name}`,
      });

      const headers = build402Headers(requirement);

      return NextResponse.json(
        {
          success: false,
          error: '결제가 필요합니다',
          payment_required: requirement,
        },
        {
          status: 402,
          headers,
        },
      );
    }

    // --- 결제 있음: 검증 → 실행 ---

    // 1. 서명 검증
    const sigResult = verifyPaymentSignature(payment);
    if (!sigResult.valid) {
      return apiError(sigResult.error ?? '결제 서명 검증 실패', 400);
    }

    // 2. 온체인 정산 확인 (tx_hash가 있는 경우)
    if (payment.tx_hash) {
      const requirement = buildPaymentRequirement({
        agentId: agent_id,
        serviceId: service_id,
        priceUsdc: pricePerCall,
        description: '',
      });

      const onchainResult = await confirmOnChainSettlement(
        payment.tx_hash,
        requirement.pay_to,
        requirement.amount,
      );

      if (!onchainResult.confirmed) {
        await recordX402Payment({
          agentId: agent_id,
          serviceId: service_id,
          payerAddress: payment.from,
          amount: pricePerCall,
          txHash: payment.tx_hash,
          status: 'failed',
        });
        return apiError(onchainResult.error ?? '온체인 정산 확인 실패', 400);
      }
    }

    // 3. 결제 기록
    const paymentId = await recordX402Payment({
      agentId: agent_id,
      serviceId: service_id,
      payerAddress: payment.from,
      amount: pricePerCall,
      txHash: payment.tx_hash,
      status: payment.tx_hash ? 'confirmed' : 'pending',
    });

    // 4. 서비스 실행 (Job 생성)
    const jobResult = await query<{ id: string }>(
      `INSERT INTO marketplace_jobs
         (service_id, agent_id, buyer_id, status, input_data, payment_amount, commission_rate, source)
       VALUES ($1, $2,
         COALESCE((SELECT id FROM users WHERE wallet_address = $3 LIMIT 1), (SELECT owner_id FROM agents WHERE id = $2)),
         'processing', $4, $5,
         (SELECT commission_rate FROM agents WHERE id = $2),
         'x402')
       RETURNING id`,
      [
        service_id,
        agent_id,
        payment.from,
        JSON.stringify(input_data ?? {}),
        pricePerCall,
      ],
    );

    // 5. 에이전트 통계 업데이트
    await query(
      `UPDATE agents SET
         total_jobs = total_jobs + 1,
         total_revenue = total_revenue + $1
       WHERE id = $2`,
      [pricePerCall, agent_id],
    );

    return apiJson({
      job_id: jobResult.rows[0].id,
      payment_id: paymentId,
      protocol: 'x402',
      amount_charged: pricePerCall,
      status: '서비스 실행 중',
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
