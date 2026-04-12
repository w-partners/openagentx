import { NextRequest } from 'next/server';
import { apiJson } from '@/lib/utils/api-response';
import { validatePartnerKey } from '@/lib/auth/partner-auth';
import { getJob } from '@/lib/partner/job-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = validatePartnerKey(request);
  if (!auth.valid) {
    return apiJson({ error: '유효하지 않은 파트너 키입니다' }, 401);
  }

  const { jobId } = await params;

  const job = getJob(jobId);
  if (!job) {
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
