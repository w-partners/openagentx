import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { DEFAULT_AGENTS, executeAgent, executeCustomAgent } from '@/lib/partner/agents';
import { setJob } from '@/lib/partner/job-store';
import { getBalance, updateBalance } from '@/lib/db/repositories/users';
import { findById, incrementUsageCount } from '@/lib/db/repositories/custom-agents';
import { randomUUID } from 'crypto';
import type { PartnerJob } from '@/lib/partner/job-store';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const executeSchema = z.object({
  agentId: z.string().min(1),
  input: z.string().min(1),
});

/**
 * POST /api/v1/agents/execute — 사용자 API Key로 에이전트 실행
 * DEFAULT_AGENTS + custom_agents 모두 지원
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const body = await request.json();
    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const { agentId, input } = parsed.data;

    // 에이전트 검색: 기본 에이전트 → 커스텀 에이전트
    const defaultAgent = DEFAULT_AGENTS.find((a) => a.id === agentId);
    let costPoints: number;
    let isCustom = false;
    let customAgentData: Awaited<ReturnType<typeof findById>> = null;

    if (defaultAgent) {
      costPoints = defaultAgent.pricePoints;
    } else if (UUID_REGEX.test(agentId)) {
      customAgentData = await findById(agentId);
      if (!customAgentData || customAgentData.status !== 'active') {
        return apiJson({ error: '에이전트를 찾을 수 없습니다' }, 404);
      }
      costPoints = customAgentData.price_points;
      isCustom = true;
    } else {
      return apiJson({ error: '에이전트를 찾을 수 없습니다' }, 404);
    }

    // 잔액 확인
    const balance = await getBalance(auth.userId);
    if (balance < costPoints) {
      return apiJson(
        {
          error: '잔액이 부족합니다',
          required: costPoints,
          current: balance,
        },
        402,
      );
    }

    // 포인트 차감
    await updateBalance(auth.userId, -costPoints);

    const jobId = randomUUID();
    const job: PartnerJob = {
      jobId,
      agentId,
      input,
      userId: auth.userId,
      partner: 'user-api',
      status: 'processing',
      usedPoints: costPoints,
      createdAt: new Date().toISOString(),
    };

    setJob(job);

    // 에이전트 실행
    try {
      let result: string;
      if (isCustom && customAgentData) {
        result = await executeCustomAgent(customAgentData.system_prompt, customAgentData.name, input);
        // usage_count 증가
        incrementUsageCount(agentId).catch(() => {});
      } else {
        result = await executeAgent(agentId, input);
      }

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date().toISOString();
      setJob(job);

      return apiJson({
        data: {
          jobId,
          status: 'completed',
          result,
          usedPoints: costPoints,
        },
      });
    } catch (execErr) {
      const errMsg = execErr instanceof Error ? execErr.message : 'AI 처리 실패';
      job.status = 'failed';
      job.error = errMsg;
      job.completedAt = new Date().toISOString();
      setJob(job);

      // 실패 시 포인트 환불
      await updateBalance(auth.userId, costPoints).catch(() => {});

      return apiJson(
        {
          data: {
            jobId,
            status: 'failed',
            error: errMsg,
          },
        },
        500,
      );
    }
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
