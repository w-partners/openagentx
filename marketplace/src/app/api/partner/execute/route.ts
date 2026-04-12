import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validatePartnerKey } from '@/lib/auth/partner-auth';
import { DEFAULT_AGENTS, executeAgent } from '@/lib/partner/agents';
import { setJob } from '@/lib/partner/job-store';
import { randomUUID } from 'crypto';
import type { PartnerJob } from '@/lib/partner/job-store';

const executeSchema = z.object({
  agentId: z.string().min(1),
  input: z.string().min(1),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  callbackUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = validatePartnerKey(request);
    if (!auth.valid) {
      return apiJson({ error: '유효하지 않은 파트너 키입니다' }, 401);
    }

    const body = await request.json();
    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const { agentId, input, userId, workspaceId, callbackUrl } = parsed.data;

    // 에이전트 존재 확인
    const agent = DEFAULT_AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      return apiJson({ error: '에이전트를 찾을 수 없습니다' }, 404);
    }

    const jobId = randomUUID();
    const job: PartnerJob = {
      jobId,
      agentId,
      input,
      userId,
      workspaceId,
      partner: auth.partner ?? 'unknown',
      status: 'processing',
      usedPoints: agent.pricePoints,
      createdAt: new Date().toISOString(),
    };

    setJob(job);

    // 텍스트 기반 에이전트는 동기 실행 시도
    try {
      const result = await executeAgent(agentId, input);

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date().toISOString();
      setJob(job);

      // 콜백 웹훅 전송 (비동기, 실패해도 무시)
      if (callbackUrl) {
        fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            status: 'completed',
            result,
            usedPoints: job.usedPoints,
            completedAt: job.completedAt,
          }),
        }).catch(() => {});
      }

      return apiJson({
        data: {
          jobId,
          status: 'completed',
          result,
          usedPoints: job.usedPoints,
        },
      });
    } catch (execErr) {
      const errMsg =
        execErr instanceof Error ? execErr.message : 'AI 처리 실패';
      job.status = 'failed';
      job.error = errMsg;
      job.completedAt = new Date().toISOString();
      setJob(job);

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
