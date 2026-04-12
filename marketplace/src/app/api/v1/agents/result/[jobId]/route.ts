import { NextRequest } from 'next/server';
import { apiJson } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { getJob } from '@/lib/partner/job-store';

/**
 * GET /api/v1/agents/result/[jobId] — 작업 결과 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await validateUserApiKey(request);
  if (!auth.valid) {
    return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
  }

  const { jobId } = await params;

  const job = getJob(jobId);
  if (!job) {
    return apiJson({ error: '작업을 찾을 수 없습니다' }, 404);
  }

  // 본인의 작업만 조회 가능
  if (job.userId && job.userId !== auth.userId) {
    return apiJson({ error: '작업을 찾을 수 없습니다' }, 404);
  }

  return apiJson({
    data: {
      jobId: job.jobId,
      status: job.status,
      result: job.result,
      usedPoints: job.usedPoints,
      completedAt: job.completedAt,
      ...(job.error ? { error: job.error } : {}),
    },
  });
}
