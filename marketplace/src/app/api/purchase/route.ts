import { NextRequest } from 'next/server';
import { apiJson, apiCatchError, parsePagination } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import { query, transaction } from '@/lib/db/pool';
import type { PoolClient } from 'pg';

/**
 * POST /api/purchase
 * 에이전트 서비스 구매
 * body: { serviceId, agentId, inputData }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const body = await request.json();
    const { serviceId, agentId, inputData } = body as {
      serviceId?: string;
      agentId?: string;
      inputData?: Record<string, unknown>;
    };

    if (!serviceId) return apiJson({ error: 'serviceId가 필요합니다' }, 400);
    if (!agentId) return apiJson({ error: 'agentId가 필요합니다' }, 400);

    // 서비스 조회
    const serviceResult = await query<{
      id: string;
      agent_id: string;
      price_usdc: string;
      is_active: boolean;
      name: string;
    }>(
      'SELECT id, agent_id, price_usdc, is_active, name FROM agent_services WHERE id = $1',
      [serviceId],
    );

    if (serviceResult.rows.length === 0) {
      return apiJson({ error: '서비스를 찾을 수 없습니다' }, 404);
    }

    const service = serviceResult.rows[0];
    if (!service.is_active) {
      return apiJson({ error: '비활성화된 서비스입니다' }, 400);
    }
    if (service.agent_id !== agentId) {
      return apiJson({ error: '서비스와 에이전트가 일치하지 않습니다' }, 400);
    }

    const price = parseFloat(service.price_usdc);

    // 잔액 확인
    const balanceResult = await query<{ balance_usdc: string }>(
      'SELECT balance_usdc FROM users WHERE id = $1',
      [user.userId],
    );
    if (balanceResult.rows.length === 0) {
      return apiJson({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    const balance = parseFloat(balanceResult.rows[0].balance_usdc);
    if (balance < price) {
      return apiJson(
        {
          error: '잔액이 부족합니다',
          data: { balance, required: price, deficit: price - balance },
        },
        402,
      );
    }

    // 에이전트 수수료율 조회
    const agentResult = await query<{ commission_rate: string }>(
      'SELECT commission_rate FROM agents WHERE id = $1',
      [agentId],
    );
    const commissionRate = agentResult.rows.length > 0
      ? parseFloat(agentResult.rows[0].commission_rate)
      : 0;
    const commissionAmount = price * (commissionRate / 100);
    const providerAmount = price - commissionAmount;

    // 트랜잭션 처리
    const job = await transaction(async (client: PoolClient) => {
      // 잔액 차감 (동시 구매 방지를 위한 낙관적 락)
      const deductResult = await client.query(
        'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING id',
        [price, user.userId],
      );
      if (deductResult.rowCount === 0) {
        throw new Error('잔액이 부족합니다');
      }

      // marketplace_jobs 생성
      const jobResult = await client.query<{
        id: string;
        status: string;
        created_at: Date;
      }>(
        `INSERT INTO marketplace_jobs (
          service_id, agent_id, buyer_id, status,
          input_data, payment_amount, escrow_balance,
          commission_rate, commission_amount, provider_amount
        ) VALUES ($1, $2, $3, 'pending', $4, $5, $5, $6, $7, $8)
        RETURNING id, status, created_at`,
        [
          serviceId,
          agentId,
          user.userId,
          JSON.stringify(inputData ?? {}),
          price,
          commissionRate,
          commissionAmount,
          providerAmount,
        ],
      );

      const jobRow = jobResult.rows[0];

      // payments 생성
      await client.query(
        `INSERT INTO payments (job_id, user_id, payment_type, amount, currency, status, metadata)
         VALUES ($1, $2, 'job_payment', $3, 'USDC', 'escrowed', $4)`,
        [
          jobRow.id,
          user.userId,
          price,
          JSON.stringify({ serviceId, agentId, serviceName: service.name }),
        ],
      );

      return {
        id: jobRow.id,
        serviceId,
        agentId,
        status: jobRow.status,
        paymentAmount: price,
        createdAt: jobRow.created_at,
      };
    });

    return apiJson({ data: job }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === '잔액이 부족합니다') {
      return apiJson({ error: msg }, 402);
    }
    return apiCatchError(err, 500);
  }
}

/**
 * GET /api/purchase
 * 구매 내역 조회 (buyer_id 기준)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { limit, offset } = parsePagination(request.nextUrl.searchParams);

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT j.id, j.service_id, j.agent_id, j.status,
                j.payment_amount, j.escrow_balance, j.result_data,
                j.created_at, j.completed_at,
                s.name as service_name, a.name as agent_name
         FROM marketplace_jobs j
         LEFT JOIN agent_services s ON s.id = j.service_id
         LEFT JOIN agents a ON a.id = j.agent_id
         WHERE j.buyer_id = $1
         ORDER BY j.created_at DESC
         LIMIT $2 OFFSET $3`,
        [user.userId, limit, offset],
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM marketplace_jobs WHERE buyer_id = $1',
        [user.userId],
      ),
    ]);

    return apiJson({
      data: dataResult.rows,
      meta: { total: parseInt(countResult.rows[0].count, 10), limit, offset },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
