/**
 * Widgets repository — Embed Widget 시스템 (외부 사이트 임베드용)
 */
import { query } from '../pool';
import { randomBytes } from 'crypto';

export interface Widget {
  id: string;
  token: string;
  owner_id: string;
  name: string;
  agent_slug: string | null;
  prompt_slug: string | null;
  cors_origins: string[];
  welcome_message: string | null;
  primary_color: string;
  position: string;
  monthly_quota: number;
  is_active: boolean;
  inject_page_context: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface WidgetWithStats extends Widget {
  monthly_use: number;
  avg_duration_ms: number;
}

const SELECT_COLS = `id, token, owner_id, name, agent_slug, prompt_slug, cors_origins,
  welcome_message, primary_color, position, monthly_quota, is_active,
  inject_page_context, metadata, created_at, updated_at`;

export function generateToken(): string {
  // oaw_<24 hex chars> = 28 chars
  return 'oaw_' + randomBytes(12).toString('hex');
}

export async function findByToken(token: string): Promise<Widget | null> {
  const res = await query<Widget>(
    `SELECT ${SELECT_COLS} FROM widgets WHERE token = $1 AND is_active = TRUE LIMIT 1`,
    [token],
  );
  return res.rows[0] ?? null;
}

export async function findByOwner(ownerId: string): Promise<WidgetWithStats[]> {
  const res = await query<WidgetWithStats>(
    `SELECT w.${SELECT_COLS.split(',').map((c) => c.trim()).join(', w.')},
            COALESCE(stats.monthly_use, 0)::int AS monthly_use,
            COALESCE(stats.avg_duration_ms, 0)::int AS avg_duration_ms
     FROM widgets w
     LEFT JOIN (
       SELECT widget_id,
              COUNT(*) AS monthly_use,
              AVG(duration_ms) AS avg_duration_ms
       FROM widget_runs
       WHERE created_at >= date_trunc('month', NOW())
         AND status = 'success'
       GROUP BY widget_id
     ) stats ON stats.widget_id = w.id
     WHERE w.owner_id = $1
     ORDER BY w.created_at DESC`,
    [ownerId],
  );
  return res.rows;
}

export async function findById(id: string, ownerId?: string): Promise<Widget | null> {
  const sql = ownerId
    ? `SELECT ${SELECT_COLS} FROM widgets WHERE id = $1 AND owner_id = $2 LIMIT 1`
    : `SELECT ${SELECT_COLS} FROM widgets WHERE id = $1 LIMIT 1`;
  const params = ownerId ? [id, ownerId] : [id];
  const res = await query<Widget>(sql, params);
  return res.rows[0] ?? null;
}

export interface CreateWidgetInput {
  owner_id: string;
  name: string;
  agent_slug?: string | null;
  prompt_slug?: string | null;
  cors_origins?: string[];
  welcome_message?: string | null;
  primary_color?: string;
  position?: string;
  monthly_quota?: number;
  inject_page_context?: boolean;
}

export async function create(input: CreateWidgetInput): Promise<Widget> {
  if (!input.agent_slug && !input.prompt_slug) {
    throw new Error('agent_slug 또는 prompt_slug 중 하나를 지정해야 합니다');
  }
  const token = generateToken();
  const res = await query<Widget>(
    `INSERT INTO widgets (token, owner_id, name, agent_slug, prompt_slug, cors_origins,
       welcome_message, primary_color, position, monthly_quota, inject_page_context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${SELECT_COLS}`,
    [
      token,
      input.owner_id,
      input.name,
      input.agent_slug ?? null,
      input.prompt_slug ?? null,
      input.cors_origins ?? [],
      input.welcome_message ?? null,
      input.primary_color ?? '#0EA5E9',
      input.position ?? 'bottom-right',
      input.monthly_quota ?? 1000,
      input.inject_page_context ?? true,
    ],
  );
  return res.rows[0];
}

export interface UpdateWidgetInput {
  name?: string;
  agent_slug?: string | null;
  prompt_slug?: string | null;
  cors_origins?: string[];
  welcome_message?: string | null;
  primary_color?: string;
  position?: string;
  monthly_quota?: number;
  is_active?: boolean;
  inject_page_context?: boolean;
}

export async function update(
  id: string,
  ownerId: string,
  updates: UpdateWidgetInput,
): Promise<Widget | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const map: Record<string, keyof UpdateWidgetInput> = {
    name: 'name',
    agent_slug: 'agent_slug',
    prompt_slug: 'prompt_slug',
    cors_origins: 'cors_origins',
    welcome_message: 'welcome_message',
    primary_color: 'primary_color',
    position: 'position',
    monthly_quota: 'monthly_quota',
    is_active: 'is_active',
    inject_page_context: 'inject_page_context',
  };

  for (const [col, key] of Object.entries(map)) {
    const val = updates[key];
    if (val !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) return findById(id, ownerId);

  values.push(id, ownerId);
  const res = await query<Widget>(
    `UPDATE widgets SET ${fields.join(', ')}
     WHERE id = $${idx++} AND owner_id = $${idx++}
     RETURNING ${SELECT_COLS}`,
    values,
  );
  return res.rows[0] ?? null;
}

export async function remove(id: string, ownerId: string): Promise<boolean> {
  const res = await query(
    `DELETE FROM widgets WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function countMonthlyRuns(widgetId: string): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM widget_runs
     WHERE widget_id = $1
       AND created_at >= date_trunc('month', NOW())
       AND status = 'success'`,
    [widgetId],
  );
  return parseInt(res.rows[0]?.count ?? '0', 10);
}

export interface WidgetRunInput {
  widget_id: string;
  session_id: string;
  origin: string | null;
  user_message: string;
  assistant_message: string | null;
  status: 'success' | 'failed' | 'quota_exceeded' | 'forbidden';
  error_msg: string | null;
  duration_ms: number;
  cost_usdc: number;
}

export async function logRun(input: WidgetRunInput): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO widget_runs (widget_id, session_id, origin, user_message, assistant_message,
       status, error_msg, duration_ms, cost_usdc)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.widget_id,
      input.session_id,
      input.origin,
      input.user_message,
      input.assistant_message,
      input.status,
      input.error_msg,
      input.duration_ms,
      input.cost_usdc,
    ],
  );
  return res.rows[0].id;
}

export async function getSessionHistory(
  widgetId: string,
  sessionId: string,
  limit = 20,
): Promise<{ user_message: string; assistant_message: string | null; created_at: Date }[]> {
  const res = await query<{
    user_message: string;
    assistant_message: string | null;
    created_at: Date;
  }>(
    `SELECT user_message, assistant_message, created_at
     FROM widget_runs
     WHERE widget_id = $1 AND session_id = $2 AND status = 'success'
     ORDER BY created_at ASC
     LIMIT $3`,
    [widgetId, sessionId, limit],
  );
  return res.rows;
}
