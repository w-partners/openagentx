import { NextRequest } from 'next/server';
import * as jobsRepo from '@/lib/db/repositories/jobs';
import * as agentsRepo from '@/lib/db/repositories/agents';
import * as rewardsRepo from '@/lib/db/repositories/rewards';
import { lockEscrow } from '@/lib/payment/escrow';
import { fulfillDynamically } from '@/lib/agents/dynamic-factory';
import { query } from '@/lib/db/pool';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';
import { toErrorMessage } from '@/lib/utils/constants';
import { notifySafe } from '@/lib/telegram/notifications';

const createJobSchema = z.object({
  agent_id: z.string().uuid(),
  service_id: z.string().uuid(),
  input_data: z.record(z.unknown()).optional(),
  payment_amount: z.number().positive().max(1_000_000),
});

// POST /api/jobs — Create a new job and execute via Dynamic Factory
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const { agent_id, service_id, input_data, payment_amount } = parsed.data;

    // Verify agent exists and is active
    const agent = await agentsRepo.findById(agent_id);
    if (!agent) return apiJson({ error: '에이전트를 찾을 수 없습니다' }, 404);
    if (agent.status !== 'active') return apiJson({ error: '비활성 에이전트입니다' }, 400);

    // Verify service exists and belongs to agent
    const svcResult = await query<{ id: string; name: string }>(
      'SELECT id, name FROM agent_services WHERE id = $1 AND agent_id = $2 AND is_active = true',
      [service_id, agent_id],
    );
    if (svcResult.rows.length === 0) {
      return apiJson({ error: '서비스를 찾을 수 없습니다' }, 404);
    }
    const serviceName = svcResult.rows[0].name;

    // Prevent self-purchase
    if (agent.owner_id === userId) {
      return apiJson({ error: '자신의 에이전트에 작업을 요청할 수 없습니다' }, 400);
    }

    // Create job record
    const jobId = await jobsRepo.createJob({
      service_id,
      agent_id,
      buyer_id: userId,
      input_data,
      payment_amount,
      commission_rate: agent.commission_rate,
    });

    // Lock escrow (deducts from buyer balance)
    await lockEscrow(jobId, userId, payment_amount);

    // Update job status to deposited
    await jobsRepo.updateJobStatus(jobId, 'deposited');

    // Notify agent owner about new order
    notifySafe(agent.owner_id, {
      type: 'order_received',
      serviceName: serviceName,
      amount: payment_amount,
      jobId,
    });

    // Execute AI directly via Dynamic Factory (synchronous for fast response)
    try {
      await jobsRepo.updateJobStatus(jobId, 'processing');

      const prompt = (typeof input_data?.prompt === 'string'
        ? input_data.prompt
        : JSON.stringify(input_data ?? {})) || 'No input provided';

      const result = await fulfillDynamically(
        prompt,
        input_data ?? {},
        { agentId: agent_id, serviceName },
      );

      await jobsRepo.updateJobStatus(jobId, 'completed', {
        result_data: {
          result: result.response,
          provider: result.provider,
          category: result.category,
          confidence: result.confidence,
          processingMs: result.processingMs,
        },
      });

      // Update agent stats
      await query(
        `UPDATE agents SET total_jobs = total_jobs + 1, updated_at = NOW() WHERE id = $1`,
        [agent_id],
      );

      // Notify buyer about order completion
      notifySafe(userId, {
        type: 'order_completed',
        serviceName: serviceName,
        jobId,
      });

      // Process rewards (cashback + referral chain)
      try {
        await rewardsRepo.processPurchaseCashback(userId, payment_amount, jobId);
        await rewardsRepo.processReferralChain(userId, payment_amount, jobId);
      } catch (rewardErr) {
        console.error('Reward processing error:', rewardErr);
      }

      return apiJson({
        data: {
          id: jobId,
          status: 'completed',
          result: {
            response: result.response,
            provider: result.provider,
            processingMs: result.processingMs,
          },
        },
      }, 201);
    } catch (execErr) {
      // AI execution failed — mark job as failed
      const errMsg = execErr instanceof Error ? execErr.message : 'AI 처리 실패';
      await jobsRepo.updateJobStatus(jobId, 'failed', { error_message: errMsg }).catch(() => {});
      return apiJson({
        data: { id: jobId, status: 'failed', error: errMsg },
      }, 201);
    }
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    const message = toErrorMessage(err);
    const status = message.includes('잔액') ? 402 : 400;
    return apiJson({ error: message }, status);
  }
}

// GET /api/jobs — List user's jobs (as buyer or agent owner)
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const { searchParams } = request.nextUrl;
    const role = searchParams.get('role') ?? 'buyer'; // 'buyer' | 'provider'
    const status = searchParams.get('status') as jobsRepo.JobStatus | null;
    const { limit, offset } = parsePagination(searchParams);

    if (role === 'provider') {
      // Get agent IDs owned by user directly, then fetch their jobs
      const agentIds = await agentsRepo.findIdsByOwner(userId);

      if (agentIds.length === 0) {
        return apiJson({ data: [], meta: { total: 0, limit, offset } });
      }

      const results = await jobsRepo.findByAgentIds(agentIds, {
        status: status ?? undefined,
        limit,
        offset,
      });

      return apiJson({
        data: results.jobs,
        meta: { total: results.total, limit, offset },
      });
    }

    // Default: buyer role
    const results = await jobsRepo.findByBuyer(userId, {
      status: status ?? undefined,
      limit,
      offset,
    });

    return apiJson({
      data: results.jobs,
      meta: { total: results.total, limit, offset },
    });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}
