import { query } from '../pool';

export interface AgentBuildRequest {
  id: string;
  requester_id: string | null;
  title: string;
  description: string;
  category: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  source_urls: string[];
  attachments: { type: string; url: string; name: string }[];
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  assigned_to: string | null;
  result_agent_id: string | null;
  admin_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createRequest(input: {
  requester_id: string;
  title: string;
  description: string;
  category?: string;
  urgency?: string;
  source_urls?: string[];
  attachments?: { type: string; url: string; name: string }[];
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO agent_build_requests (requester_id, title, description, category, urgency, source_urls, attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.requester_id,
      input.title,
      input.description,
      input.category ?? 'general',
      input.urgency ?? 'normal',
      input.source_urls ?? [],
      JSON.stringify(input.attachments ?? []),
    ],
  );
  return result.rows[0].id;
}

export async function findAll(filters: {
  status?: string;
  requester_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{ requests: AgentBuildRequest[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.requester_id) {
    conditions.push(`requester_id = $${idx++}`);
    values.push(filters.requester_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = filters.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<AgentBuildRequest>(
      `SELECT * FROM agent_build_requests ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM agent_build_requests ${where}`,
      values,
    ),
  ]);

  return {
    requests: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findById(id: string): Promise<AgentBuildRequest | null> {
  const result = await query<AgentBuildRequest>(
    'SELECT * FROM agent_build_requests WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateStatus(
  id: string,
  status: string,
  adminNotes?: string,
): Promise<void> {
  const sets = ['status = $1', 'updated_at = NOW()'];
  const values: unknown[] = [status];
  let idx = 2;

  if (adminNotes !== undefined) {
    sets.push(`admin_notes = $${idx++}`);
    values.push(adminNotes);
  }

  values.push(id);
  await query(
    `UPDATE agent_build_requests SET ${sets.join(', ')} WHERE id = $${idx}`,
    values,
  );
}
