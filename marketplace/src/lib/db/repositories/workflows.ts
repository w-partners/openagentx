import { query } from '../pool';

export type WorkflowStatus = 'running' | 'success' | 'error';

export interface WorkflowNode {
  id: string;
  type: 'input' | 'agent' | 'prompt' | 'output' | 'condition';
  position: { x: number; y: number };
  data: {
    slug?: string;
    label?: string;
    [k: string]: unknown;
  };
}

export interface WorkflowEdge {
  from: string;
  to: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string;
  definition: WorkflowDefinition;
  is_public: boolean;
  is_featured: boolean;
  use_count: number;
  category: string;
  tags: string[];
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string | null;
  input_text: string;
  output_text: string | null;
  step_results: Record<string, { status: string; output?: string; duration_ms?: number; error?: string }>;
  status: WorkflowStatus;
  total_duration_ms: number;
  error_msg: string | null;
  created_at: Date;
  completed_at: Date | null;
}

const COLS = `id, slug, name, description, owner_id, definition, is_public, is_featured,
  use_count, category, tags, metadata, created_at, updated_at`;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

export async function findAll(filters: {
  q?: string;
  category?: string;
  owner_id?: string;
  is_public?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ workflows: Workflow[]; total: number }> {
  const conds: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if (filters.is_public !== undefined) {
    conds.push(`is_public = $${idx++}`);
    vals.push(filters.is_public);
  }
  if (filters.owner_id) {
    conds.push(`owner_id = $${idx++}`);
    vals.push(filters.owner_id);
  }
  if (filters.category) {
    conds.push(`category = $${idx++}`);
    vals.push(filters.category);
  }
  if (filters.q) {
    conds.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
    vals.push(`%${filters.q}%`);
    idx++;
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const [data, count] = await Promise.all([
    query<Workflow>(
      `SELECT ${COLS} FROM workflows ${where}
       ORDER BY is_featured DESC, use_count DESC, created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...vals, limit, offset],
    ),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM workflows ${where}`, vals),
  ]);
  return { workflows: data.rows, total: parseInt(count.rows[0].count, 10) };
}

export async function findBySlug(slug: string): Promise<Workflow | null> {
  const r = await query<Workflow>(`SELECT ${COLS} FROM workflows WHERE slug = $1 LIMIT 1`, [slug]);
  return r.rows[0] ?? null;
}

export async function findById(id: string): Promise<Workflow | null> {
  const r = await query<Workflow>(`SELECT ${COLS} FROM workflows WHERE id = $1 LIMIT 1`, [id]);
  return r.rows[0] ?? null;
}

export async function create(input: {
  slug?: string;
  name: string;
  description?: string;
  owner_id: string;
  definition: WorkflowDefinition;
  is_public?: boolean;
  category?: string;
  tags?: string[];
}): Promise<Workflow> {
  let slug = input.slug ? slugify(input.slug) : slugify(input.name);
  if (!slug) slug = `wf-${Date.now().toString(36)}`;
  const exists = await findBySlug(slug);
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const r = await query<Workflow>(
    `INSERT INTO workflows
       (slug, name, description, owner_id, definition, is_public, category, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING ${COLS}`,
    [
      slug,
      input.name,
      input.description ?? null,
      input.owner_id,
      JSON.stringify(input.definition),
      input.is_public ?? false,
      input.category ?? 'general',
      input.tags ?? [],
    ],
  );
  return r.rows[0];
}

export async function updateBySlug(
  slug: string,
  ownerOnly: string | null,
  updates: Partial<{
    name: string;
    description: string;
    definition: WorkflowDefinition;
    is_public: boolean;
    category: string;
    tags: string[];
  }>,
): Promise<Workflow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    sets.push(`${k} = $${idx++}`);
    vals.push(k === 'definition' ? JSON.stringify(v) : v);
  }
  if (sets.length === 0) return findBySlug(slug);

  vals.push(slug);
  let sql = `UPDATE workflows SET ${sets.join(', ')} WHERE slug = $${idx}`;
  if (ownerOnly) {
    vals.push(ownerOnly);
    sql += ` AND owner_id = $${idx + 1}`;
  }
  sql += ` RETURNING ${COLS}`;

  const r = await query<Workflow>(sql, vals);
  return r.rows[0] ?? null;
}

export async function deleteBySlug(slug: string, ownerOnly: string | null): Promise<boolean> {
  let sql = `DELETE FROM workflows WHERE slug = $1`;
  const vals: unknown[] = [slug];
  if (ownerOnly) {
    sql += ` AND owner_id = $2`;
    vals.push(ownerOnly);
  }
  const r = await query(sql, vals);
  return (r.rowCount ?? 0) > 0;
}

export async function incrementUseCount(id: string): Promise<void> {
  await query('UPDATE workflows SET use_count = use_count + 1 WHERE id = $1', [id]);
}

// --- workflow_runs ---

export async function createRun(input: {
  workflow_id: string;
  user_id: string | null;
  input_text: string;
}): Promise<WorkflowRun> {
  const r = await query<WorkflowRun>(
    `INSERT INTO workflow_runs (workflow_id, user_id, input_text, status)
     VALUES ($1,$2,$3,'running')
     RETURNING *`,
    [input.workflow_id, input.user_id, input.input_text],
  );
  return r.rows[0];
}

export async function finalizeRun(input: {
  id: string;
  status: WorkflowStatus;
  output_text: string | null;
  step_results: Record<string, unknown>;
  total_duration_ms: number;
  error_msg?: string | null;
}): Promise<void> {
  await query(
    `UPDATE workflow_runs
       SET status = $1,
           output_text = $2,
           step_results = $3,
           total_duration_ms = $4,
           error_msg = $5,
           completed_at = NOW()
     WHERE id = $6`,
    [
      input.status,
      input.output_text,
      JSON.stringify(input.step_results),
      input.total_duration_ms,
      input.error_msg ?? null,
      input.id,
    ],
  );
}

export async function findRun(id: string): Promise<WorkflowRun | null> {
  const r = await query<WorkflowRun>(`SELECT * FROM workflow_runs WHERE id = $1 LIMIT 1`, [id]);
  return r.rows[0] ?? null;
}
