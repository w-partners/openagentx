import { query } from '../pool';

export interface CustomAgent {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  system_prompt: string;
  category: string;
  price_points: number;
  result_type: string;
  tags: string[];
  capabilities: string[];
  sample_input: string | null;
  sample_output: string | null;
  github_repo: string | null;
  reference_urls: string[];
  status: string;
  usage_count: number;
  is_free: boolean;
  allowed_tools: string[] | null;
  created_at: Date;
  updated_at: Date;
}

let _tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (_tableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS custom_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID NOT NULL REFERENCES users(id),
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'general',
      price_points INTEGER NOT NULL DEFAULT 100,
      result_type VARCHAR(50) DEFAULT 'text',
      tags TEXT[] DEFAULT '{}',
      capabilities TEXT[] DEFAULT '{}',
      sample_input TEXT,
      sample_output TEXT,
      github_repo VARCHAR(500),
      reference_urls TEXT[] DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'active',
      usage_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_custom_agents_creator ON custom_agents(creator_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_custom_agents_status ON custom_agents(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_custom_agents_category ON custom_agents(category)');
  _tableEnsured = true;
}

export async function createAgent(
  creatorId: string,
  data: {
    name: string;
    description: string;
    systemPrompt: string;
    category?: string;
    pricePoints?: number;
    resultType?: string;
    tags?: string[];
    capabilities?: string[];
    sampleInput?: string;
    sampleOutput?: string;
    githubRepo?: string;
    referenceUrls?: string[];
  },
): Promise<CustomAgent> {
  await ensureTable();
  const result = await query<CustomAgent>(
    `INSERT INTO custom_agents
       (creator_id, name, description, system_prompt, category, price_points, result_type, tags, capabilities, sample_input, sample_output, github_repo, reference_urls)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      creatorId,
      data.name,
      data.description,
      data.systemPrompt,
      data.category ?? 'general',
      data.pricePoints ?? 100,
      data.resultType ?? 'text',
      data.tags ?? [],
      data.capabilities ?? [],
      data.sampleInput ?? null,
      data.sampleOutput ?? null,
      data.githubRepo ?? null,
      data.referenceUrls ?? [],
    ],
  );
  return result.rows[0];
}

export async function updateAgent(
  agentId: string,
  creatorId: string,
  data: Partial<{
    name: string;
    description: string;
    systemPrompt: string;
    category: string;
    pricePoints: number;
    resultType: string;
    tags: string[];
    capabilities: string[];
    sampleInput: string;
    sampleOutput: string;
    githubRepo: string;
    referenceUrls: string[];
    status: string;
  }>,
): Promise<CustomAgent | null> {
  await ensureTable();

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    systemPrompt: 'system_prompt',
    category: 'category',
    pricePoints: 'price_points',
    resultType: 'result_type',
    tags: 'tags',
    capabilities: 'capabilities',
    sampleInput: 'sample_input',
    sampleOutput: 'sample_output',
    githubRepo: 'github_repo',
    referenceUrls: 'reference_urls',
    status: 'status',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    const val = data[key as keyof typeof data];
    if (val !== undefined) {
      sets.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  if (sets.length === 0) return null;

  sets.push(`updated_at = NOW()`);
  values.push(agentId, creatorId);

  const result = await query<CustomAgent>(
    `UPDATE custom_agents SET ${sets.join(', ')} WHERE id = $${idx++} AND creator_id = $${idx} RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deleteAgent(agentId: string, creatorId: string): Promise<boolean> {
  await ensureTable();
  const result = await query(
    `UPDATE custom_agents SET status = 'disabled', updated_at = NOW() WHERE id = $1 AND creator_id = $2 AND status != 'disabled'`,
    [agentId, creatorId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function findById(agentId: string): Promise<CustomAgent | null> {
  await ensureTable();
  const result = await query<CustomAgent>(
    'SELECT * FROM custom_agents WHERE id = $1',
    [agentId],
  );
  return result.rows[0] ?? null;
}

export async function findByCreator(creatorId: string): Promise<CustomAgent[]> {
  await ensureTable();
  const result = await query<CustomAgent>(
    `SELECT * FROM custom_agents WHERE creator_id = $1 AND status != 'disabled' ORDER BY created_at DESC`,
    [creatorId],
  );
  return result.rows;
}

export async function findActive(): Promise<CustomAgent[]> {
  await ensureTable();
  const result = await query<CustomAgent>(
    `SELECT * FROM custom_agents WHERE status = 'active' ORDER BY usage_count DESC, created_at DESC`,
  );
  return result.rows;
}

export async function incrementUsageCount(agentId: string): Promise<void> {
  await ensureTable();
  await query('UPDATE custom_agents SET usage_count = usage_count + 1 WHERE id = $1', [agentId]);
}
