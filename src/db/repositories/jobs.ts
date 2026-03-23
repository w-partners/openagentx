import { query } from '../pool.js';

export interface AcpJob {
  id: string;
  acp_job_id: string;
  service_type: string;
  status: string;
  buyer_address: string | null;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown> | null;
  price_usdc: number;
  earned_usdc: number | null;
  processing_ms: number | null;
  error_message: string | null;
  evaluation_score: number | null;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
}

export async function createJob(job: {
  acp_job_id: string;
  service_type: string;
  buyer_address?: string;
  input_data: Record<string, unknown>;
  price_usdc: number;
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO acp_jobs (acp_job_id, service_type, status, buyer_address, input_data, price_usdc)
     VALUES ($1, $2, 'processing', $3, $4, $5)
     RETURNING id`,
    [job.acp_job_id, job.service_type, job.buyer_address ?? null, JSON.stringify(job.input_data), job.price_usdc],
  );
  return result.rows[0].id;
}

export async function updateJob(
  id: string,
  updates: {
    status?: string;
    result_data?: Record<string, unknown>;
    earned_usdc?: number;
    processing_ms?: number;
    error_message?: string;
    evaluation_score?: number;
  },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.status !== undefined) {
    sets.push(`status = $${idx++}`);
    values.push(updates.status);
    if (updates.status === 'completed') {
      sets.push(`completed_at = NOW()`);
    }
  }
  if (updates.result_data !== undefined) {
    sets.push(`result_data = $${idx++}`);
    values.push(JSON.stringify(updates.result_data));
  }
  if (updates.earned_usdc !== undefined) {
    sets.push(`earned_usdc = $${idx++}`);
    values.push(updates.earned_usdc);
  }
  if (updates.processing_ms !== undefined) {
    sets.push(`processing_ms = $${idx++}`);
    values.push(updates.processing_ms);
  }
  if (updates.error_message !== undefined) {
    sets.push(`error_message = $${idx++}`);
    values.push(updates.error_message);
  }
  if (updates.evaluation_score !== undefined) {
    sets.push(`evaluation_score = $${idx++}`);
    values.push(updates.evaluation_score);
  }

  if (sets.length === 0) return;

  values.push(id);
  await query(`UPDATE acp_jobs SET ${sets.join(', ')} WHERE id = $${idx}`, values);
}

export async function findById(id: string): Promise<AcpJob | null> {
  const result = await query<AcpJob>(`SELECT * FROM acp_jobs WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findAll(filters: {
  status?: string;
  service_type?: string;
  limit?: number;
  offset?: number;
}): Promise<AcpJob[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.service_type) {
    conditions.push(`service_type = $${idx++}`);
    values.push(filters.service_type);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  values.push(limit, offset);
  const result = await query<AcpJob>(
    `SELECT * FROM acp_jobs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values,
  );
  return result.rows;
}

export async function getStats(date?: string): Promise<{
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_earned: number;
  avg_processing_ms: number;
  by_service: Record<string, number>;
}> {
  const dateFilter = date ? `AND created_at::date = $1` : '';
  const params = date ? [date] : [];

  const [result, byServiceResult] = await Promise.all([
    query<{
      total_jobs: string;
      completed_jobs: string;
      failed_jobs: string;
      total_earned: string;
      avg_processing_ms: string;
    }>(
      `SELECT
         COUNT(*) as total_jobs,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
         COALESCE(SUM(earned_usdc) FILTER (WHERE status = 'completed'), 0) as total_earned,
         COALESCE(AVG(processing_ms) FILTER (WHERE processing_ms IS NOT NULL), 0) as avg_processing_ms
       FROM acp_jobs WHERE 1=1 ${dateFilter}`,
      params,
    ),
    query<{ service_type: string; count: string }>(
      `SELECT service_type, COUNT(*) as count FROM acp_jobs WHERE 1=1 ${dateFilter} GROUP BY service_type`,
      params,
    ),
  ]);

  const row = result.rows[0];
  const byService: Record<string, number> = {};
  for (const r of byServiceResult.rows) {
    byService[r.service_type] = parseInt(r.count, 10);
  }

  return {
    total_jobs: parseInt(row.total_jobs, 10),
    completed_jobs: parseInt(row.completed_jobs, 10),
    failed_jobs: parseInt(row.failed_jobs, 10),
    total_earned: parseFloat(row.total_earned),
    avg_processing_ms: Math.round(parseFloat(row.avg_processing_ms)),
    by_service: byService,
  };
}
