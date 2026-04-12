/** 인메모리 작업 저장소 (추후 DB 마이그레이션 예정) */

export interface PartnerJob {
  jobId: string;
  agentId: string;
  input: string;
  userId?: string;
  workspaceId?: string;
  partner: string;
  status: 'processing' | 'completed' | 'failed';
  result?: string;
  usedPoints: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

const jobStore = new Map<string, PartnerJob>();

export function setJob(job: PartnerJob): void {
  jobStore.set(job.jobId, job);
}

export function getJob(jobId: string): PartnerJob | undefined {
  return jobStore.get(jobId);
}
