import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';

export type JobStatus =
  | 'pending'
  | 'deposited'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'disputed'
  | 'refunded';

export interface Job {
  id: string;
  service_id: string;
  agent_id: string;
  buyer_id: string;
  status: JobStatus;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown> | null;
  payment_amount: number;
  escrow_balance: number;
  commission_rate: number;
  commission_amount: number;
  provider_amount: number;
  source: string;
  processing_ms: number | null;
  error_message: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Columns for list queries (excludes large result_data) */
const LIST_COLUMNS = `id, service_id, agent_id, buyer_id, status, input_data,
  payment_amount, escrow_balance, commission_rate, commission_amount, provider_amount,
  source, processing_ms, error_message, completed_at, created_at, updated_at`;

/** Valid status transitions */
const STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['deposited', 'failed'],
  deposited: ['processing', 'refunded'],
  processing: ['completed', 'failed', 'disputed'],
  completed: [],
  failed: ['refunded'],
  disputed: ['refunded', 'completed'],
  refunded: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function createJob(input: {
  service_id: string;
  agent_id: string;
  buyer_id: string;
  input_data?: Record<string, unknown>;
  payment_amount: number;
  commission_rate: number;
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO marketplace_jobs
       (service_id, agent_id, buyer_id, input_data, payment_amount, commission_rate, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [
      input.service_id,
      input.agent_id,
      input.buyer_id,
      JSON.stringify(input.input_data ?? {}),
      input.payment_amount,
      input.commission_rate,
    ],
  );
  return result.rows[0].id;
}

export async function updateJobStatus(
  id: string,
  newStatus: JobStatus,
  extra?: { result_data?: Record<string, unknown>; error_message?: string },
): Promise<void> {
  await transaction(async (client: PoolClient) => {
    const current = await client.query<{ status: JobStatus }>(
      'SELECT status FROM marketplace_jobs WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (current.rows.length === 0) throw new Error('작업을 찾을 수 없습니다');

    const currentStatus = current.rows[0].status;
    if (!canTransition(currentStatus, newStatus)) {
      throw new Error(`상태를 ${currentStatus}에서 ${newStatus}로 변경할 수 없습니다`);
    }

    const sets: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: unknown[] = [newStatus];
    let idx = 2;

    if (newStatus === 'completed') {
      sets.push(`completed_at = NOW()`);
    }
    if (extra?.result_data) {
      sets.push(`result_data = $${idx++}`);
      values.push(JSON.stringify(extra.result_data));
    }
    if (extra?.error_message) {
      sets.push(`error_message = $${idx++}`);
      values.push(extra.error_message);
    }

    values.push(id);
    await client.query(
      `UPDATE marketplace_jobs SET ${sets.join(', ')} WHERE id = $${idx}`,
      values,
    );
  });
}

export async function findById(id: string): Promise<Job | null> {
  const result = await query<Job>('SELECT * FROM marketplace_jobs WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findByBuyer(
  buyerId: string,
  filters?: { status?: JobStatus; limit?: number; offset?: number },
): Promise<{ jobs: Job[]; total: number }> {
  const conditions = ['buyer_id = $1'];
  const values: unknown[] = [buyerId];
  let idx = 2;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters?.limit ?? 20, 100);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<Job>(
      `SELECT ${LIST_COLUMNS} FROM marketplace_jobs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM marketplace_jobs ${where}`,
      values,
    ),
  ]);

  return { jobs: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) };
}

export async function findByAgent(
  agentId: string,
  filters?: { status?: JobStatus; limit?: number; offset?: number },
): Promise<{ jobs: Job[]; total: number }> {
  const conditions = ['agent_id = $1'];
  const values: unknown[] = [agentId];
  let idx = 2;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters?.limit ?? 20, 100);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<Job>(
      `SELECT ${LIST_COLUMNS} FROM marketplace_jobs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM marketplace_jobs ${where}`,
      values,
    ),
  ]);

  return { jobs: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) };
}

export async function findByAgentIds(
  agentIds: string[],
  filters?: { status?: JobStatus; limit?: number; offset?: number },
): Promise<{ jobs: Job[]; total: number }> {
  if (agentIds.length === 0) return { jobs: [], total: 0 };

  const conditions = [`agent_id = ANY($1)`];
  const values: unknown[] = [agentIds];
  let idx = 2;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters?.limit ?? 20, 100);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<Job>(
      `SELECT ${LIST_COLUMNS} FROM marketplace_jobs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM marketplace_jobs ${where}`,
      values,
    ),
  ]);

  return { jobs: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) };
}

export async function getStats(agentId: string): Promise<{
  total: number;
  completed: number;
  failed: number;
  disputed: number;
  totalRevenue: number;
  avgCompletionTime: number | null;
}> {
  const result = await query<{
    total: string;
    completed: string;
    failed: string;
    disputed: string;
    total_revenue: string;
    avg_completion_seconds: string | null;
  }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'completed') as completed,
       COUNT(*) FILTER (WHERE status = 'failed') as failed,
       COUNT(*) FILTER (WHERE status = 'disputed') as disputed,
       COALESCE(SUM(provider_amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
       EXTRACT(EPOCH FROM AVG(completed_at - created_at) FILTER (WHERE status = 'completed')) as avg_completion_seconds
     FROM marketplace_jobs
     WHERE agent_id = $1`,
    [agentId],
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total, 10),
    completed: parseInt(row.completed, 10),
    failed: parseInt(row.failed, 10),
    disputed: parseInt(row.disputed, 10),
    totalRevenue: parseFloat(row.total_revenue),
    avgCompletionTime: row.avg_completion_seconds ? parseFloat(row.avg_completion_seconds) : null,
  };
}
