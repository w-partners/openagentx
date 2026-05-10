import { query, transaction } from '../pool';

export type AgentStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Agent {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  description_ko: string | null;
  category: string;
  tags: string[];
  logo_url: string | null;
  status: AgentStatus;
  acp_agent_id: string | null;
  avg_rating: number;
  total_reviews: number;
  total_jobs: number;
  total_revenue: number;
  commission_rate: number;
  ranking_score: number;
  is_featured: boolean;
  sample_images: string[];
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

export function calculateRankingScore(commissionRate: number, avgRating: number, totalJobs: number): number {
  return commissionRate * 0.5 + avgRating * 0.3 + Math.min(totalJobs, 100) * 0.2;
}

export async function createAgent(input: {
  owner_id: string;
  name: string;
  description: string;
  description_ko?: string;
  category: string;
  tags?: string[];
  logo_url?: string;
  commission_rate?: number;
  sample_images?: string[];
}): Promise<string> {
  const slug = generateSlug(input.name) + '-' + Date.now().toString(36);
  const commissionRate = Math.min(Math.max(input.commission_rate ?? 0, 0), 50);
  const rankingScore = calculateRankingScore(commissionRate, 0, 0);

  const result = await query<{ id: string }>(
    `INSERT INTO agents (owner_id, name, slug, description, description_ko, category, tags, logo_url, commission_rate, ranking_score, sample_images)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      input.owner_id, input.name, slug, input.description,
      input.description_ko ?? null, input.category,
      input.tags ?? [], input.logo_url ?? null,
      commissionRate, rankingScore,
      input.sample_images ?? [],
    ],
  );
  return result.rows[0].id;
}

export async function updateAgent(id: string, ownerId: string, updates: Partial<{
  name: string;
  description: string;
  description_ko: string;
  category: string;
  tags: string[];
  logo_url: string;
  commission_rate: number;
}>): Promise<void> {
  // Verify ownership
  const owner = await query('SELECT id FROM agents WHERE id = $1 AND owner_id = $2', [id, ownerId]);
  if (owner.rows.length === 0) throw new Error('에이전트를 찾을 수 없거나 권한이 없습니다');

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name', description: 'description', description_ko: 'description_ko',
    category: 'category', tags: 'tags', logo_url: 'logo_url', commission_rate: 'commission_rate',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    const val = updates[key as keyof typeof updates];
    if (val !== undefined) {
      if (key === 'commission_rate') {
        sets.push(`${col} = $${idx++}`);
        values.push(Math.min(Math.max(val as number, 0), 50));
      } else {
        sets.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }
  }

  if (sets.length === 0) return;

  values.push(id);
  await query(`UPDATE agents SET ${sets.join(', ')} WHERE id = $${idx}`, values);

  // Recalculate ranking if commission changed
  if (updates.commission_rate !== undefined) {
    await recalculateRanking(id);
  }
}

export async function softDeleteAgent(id: string, ownerId: string): Promise<void> {
  const result = await query(
    `UPDATE agents SET status = 'suspended' WHERE id = $1 AND owner_id = $2 AND status != 'suspended'`,
    [id, ownerId],
  );
  if (result.rowCount === 0) throw new Error('에이전트를 찾을 수 없거나 이미 비활성 상태입니다');
}

export async function findById(id: string): Promise<Agent | null> {
  const result = await query<Agent>('SELECT * FROM agents WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findAll(filters: {
  category?: string;
  status?: AgentStatus;
  q?: string;
  sort?: 'ranking_score' | 'created_at' | 'avg_rating' | 'total_jobs';
  limit?: number;
  offset?: number;
}): Promise<{ agents: Agent[]; total: number }> {
  const conditions: string[] = ["status = 'active'"];
  const values: unknown[] = [];
  let idx = 1;

  if (filters.category) {
    conditions.push(`category = $${idx++}`);
    values.push(filters.category);
  }
  if (filters.status) {
    conditions[0] = `status = $${idx++}`;
    values.push(filters.status);
  }
  if (filters.q) {
    conditions.push(`search_vector @@ plainto_tsquery('simple', $${idx++})`);
    values.push(filters.q);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sort = filters.sort ?? 'ranking_score';
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = filters.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<Agent>(
      `SELECT id, owner_id, name, slug, description, description_ko, category, tags, logo_url,
              status, acp_agent_id, avg_rating, total_reviews, total_jobs, total_revenue,
              commission_rate, ranking_score, is_featured, metadata, created_at, updated_at
       FROM agents ${where} ORDER BY ${sort} DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM agents ${where}`,
      values,
    ),
  ]);

  return {
    agents: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findIdsByOwner(ownerId: string): Promise<string[]> {
  const result = await query<{ id: string }>(
    "SELECT id FROM agents WHERE owner_id = $1 AND status = 'active'",
    [ownerId],
  );
  return result.rows.map((r) => r.id);
}

export async function recalculateRanking(agentId: string): Promise<void> {
  await query(
    `UPDATE agents SET ranking_score = (
       commission_rate * 0.5 + avg_rating * 0.3 + LEAST(total_jobs, 100) * 0.2
     ) WHERE id = $1`,
    [agentId],
  );
}

export async function updateCommission(agentId: string, ownerId: string, rate: number): Promise<void> {
  const clampedRate = Math.min(Math.max(rate, 0), 50);
  await query(
    `UPDATE agents SET commission_rate = $1 WHERE id = $2 AND owner_id = $3`,
    [clampedRate, agentId, ownerId],
  );
  await recalculateRanking(agentId);
}
