import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';

// --- Types ---

export type BountyStatus = 'open' | 'pending_match' | 'claimed' | 'fulfilled' | 'cancelled';

export interface Bounty {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  budget_usdc: number;
  status: BountyStatus;
  selected_agent_id: string | null;
  job_id: string | null;
  deadline: Date | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface BountyCandidate {
  id: string;
  bounty_id: string;
  agent_id: string;
  agent_name: string;
  agent_slug: string;
  agent_avg_rating: number;
  agent_total_jobs: number;
  proposed_at: Date;
}

// --- Repository ---

export async function createBounty(input: {
  creator_id: string;
  title: string;
  description: string;
  category: string;
  budget_usdc: number;
  deadline?: Date;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (input.budget_usdc <= 0) {
    throw new Error('예산은 0보다 커야 합니다');
  }

  const result = await query<{ id: string }>(
    `INSERT INTO bounties (creator_id, title, description, category, budget_usdc, deadline, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.creator_id,
      input.title,
      input.description,
      input.category,
      input.budget_usdc,
      input.deadline ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );

  return result.rows[0].id;
}

export async function findAll(filters: {
  status?: BountyStatus;
  category?: string;
  creator_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{ bounties: Bounty[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.category) {
    conditions.push(`category = $${idx++}`);
    values.push(filters.category);
  }
  if (filters.creator_id) {
    conditions.push(`creator_id = $${idx++}`);
    values.push(filters.creator_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<Bounty>(
      `SELECT * FROM bounties ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM bounties ${where}`,
      values,
    ),
  ]);

  return {
    bounties: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findById(id: string): Promise<Bounty | null> {
  const result = await query<Bounty>('SELECT * FROM bounties WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findCandidates(bountyId: string): Promise<BountyCandidate[]> {
  const result = await query<BountyCandidate>(
    `SELECT bc.id, bc.bounty_id, bc.agent_id,
            a.name AS agent_name, a.slug AS agent_slug,
            a.avg_rating AS agent_avg_rating, a.total_jobs AS agent_total_jobs,
            bc.created_at AS proposed_at
     FROM bounty_candidates bc
     JOIN agents a ON a.id = bc.agent_id
     WHERE bc.bounty_id = $1
     ORDER BY a.avg_rating DESC, a.total_jobs DESC`,
    [bountyId],
  );
  return result.rows;
}

export async function applyCandidate(bountyId: string, agentId: string): Promise<string> {
  // Verify bounty is open
  const bounty = await findById(bountyId);
  if (!bounty) throw new Error('바운티를 찾을 수 없습니다');
  if (bounty.status !== 'open') throw new Error('지원 가능한 상태가 아닙니다');

  // Check duplicate application
  const existing = await query(
    'SELECT id FROM bounty_candidates WHERE bounty_id = $1 AND agent_id = $2',
    [bountyId, agentId],
  );
  if (existing.rowCount !== null && existing.rowCount > 0) {
    throw new Error('이미 지원한 에이전트입니다');
  }

  const result = await query<{ id: string }>(
    `INSERT INTO bounty_candidates (bounty_id, agent_id)
     VALUES ($1, $2)
     RETURNING id`,
    [bountyId, agentId],
  );

  // Update bounty status to pending_match if first candidate
  await query(
    `UPDATE bounties SET status = 'pending_match' WHERE id = $1 AND status = 'open'`,
    [bountyId],
  );

  return result.rows[0].id;
}

export async function selectCandidate(
  bountyId: string,
  agentId: string,
  creatorId: string,
): Promise<string> {
  return await transaction(async (client: PoolClient) => {
    // Verify ownership and status
    const bountyResult = await client.query(
      `SELECT * FROM bounties WHERE id = $1 AND creator_id = $2`,
      [bountyId, creatorId],
    );

    if (bountyResult.rowCount === 0) {
      throw new Error('바운티를 찾을 수 없거나 권한이 없습니다');
    }

    const bounty = bountyResult.rows[0];

    if (bounty.status !== 'open' && bounty.status !== 'pending_match') {
      throw new Error('후보를 선택할 수 없는 상태입니다');
    }

    // Verify candidate exists
    const candidateResult = await client.query(
      'SELECT id FROM bounty_candidates WHERE bounty_id = $1 AND agent_id = $2',
      [bountyId, agentId],
    );

    if (candidateResult.rowCount === 0) {
      throw new Error('해당 에이전트는 지원하지 않았습니다');
    }

    // Create marketplace_job
    const jobResult = await client.query<{ id: string }>(
      `INSERT INTO marketplace_jobs (agent_id, buyer_id, payment_amount, status, commission_rate)
       SELECT $1, $2, $3, 'pending',
              COALESCE((SELECT commission_rate FROM agents WHERE id = $1), 0)
       RETURNING id`,
      [agentId, creatorId, bounty.budget_usdc],
    );

    const jobId = jobResult.rows[0].id;

    // Update bounty
    await client.query(
      `UPDATE bounties SET
         status = 'claimed',
         selected_agent_id = $1,
         job_id = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [agentId, jobId, bountyId],
    );

    return jobId;
  });
}

export async function cancelBounty(bountyId: string, creatorId: string): Promise<void> {
  const result = await query(
    `UPDATE bounties SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND creator_id = $2 AND status IN ('open', 'pending_match')`,
    [bountyId, creatorId],
  );

  if (result.rowCount === 0) {
    throw new Error('바운티를 찾을 수 없거나 취소할 수 없는 상태입니다');
  }
}

export async function fulfillBounty(bountyId: string): Promise<void> {
  await query(
    `UPDATE bounties SET status = 'fulfilled', updated_at = NOW()
     WHERE id = $1 AND status = 'claimed'`,
    [bountyId],
  );
}
