import { query } from '../pool';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';

// ─── Types ───

export interface AgentComment {
  id: string;
  agent_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AgentCommentWithUser extends AgentComment {
  nickname: string;
  avatar_url: string | null;
  reply_count: number;
}

// ─── Repository ───

const MAX_BODY = 2000;

function validateBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) throw new Error('댓글 내용을 입력하세요');
  if (trimmed.length > MAX_BODY) throw new Error(`댓글은 ${MAX_BODY}자 이내여야 합니다`);
  return trimmed;
}

/**
 * Resolve the given identifier as an agent UUID. Accepts either a UUID
 * (returned as-is if it exists) or a slug.
 */
export async function resolveAgentId(idOrSlug: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  if (isUuid) {
    const res = await query<{ id: string }>('SELECT id FROM agents WHERE id = $1', [idOrSlug]);
    return res.rows[0]?.id ?? null;
  }
  const res = await query<{ id: string }>('SELECT id FROM agents WHERE slug = $1', [idOrSlug]);
  return res.rows[0]?.id ?? null;
}

export async function createComment(input: {
  agent_id: string;
  user_id: string;
  parent_id?: string | null;
  body: string;
}): Promise<string> {
  const body = validateBody(input.body);

  // Verify the agent exists
  const agentRes = await query('SELECT id FROM agents WHERE id = $1', [input.agent_id]);
  if (agentRes.rowCount === 0) throw new Error('에이전트를 찾을 수 없습니다');

  // If reply, verify parent belongs to same agent and is not nested-nested
  if (input.parent_id) {
    const parentRes = await query<{ agent_id: string; parent_id: string | null }>(
      'SELECT agent_id, parent_id FROM agent_comments WHERE id = $1 AND is_deleted = false',
      [input.parent_id],
    );
    if (parentRes.rowCount === 0) throw new Error('상위 댓글을 찾을 수 없습니다');
    if (parentRes.rows[0].agent_id !== input.agent_id) {
      throw new Error('상위 댓글의 에이전트가 일치하지 않습니다');
    }
    if (parentRes.rows[0].parent_id !== null) {
      throw new Error('답글에는 다시 답글을 달 수 없습니다');
    }
  }

  const result = await query<{ id: string }>(
    `INSERT INTO agent_comments (agent_id, user_id, parent_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.agent_id, input.user_id, input.parent_id ?? null, body],
  );
  return result.rows[0].id;
}

export async function listByAgent(
  agentId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ comments: AgentCommentWithUser[]; replies: AgentCommentWithUser[]; total: number }> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = options.offset ?? 0;

  // Top-level comments (parent_id IS NULL) with pagination, plus reply count
  const [topResult, countResult] = await Promise.all([
    query<AgentCommentWithUser>(
      `SELECT c.*, u.nickname, u.avatar_url,
              COALESCE(
                (SELECT COUNT(*) FROM agent_comments r
                  WHERE r.parent_id = c.id AND r.is_deleted = false),
                0
              )::int AS reply_count
         FROM agent_comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.agent_id = $1
          AND c.parent_id IS NULL
          AND c.is_deleted = false
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3`,
      [agentId, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM agent_comments
        WHERE agent_id = $1 AND parent_id IS NULL AND is_deleted = false`,
      [agentId],
    ),
  ]);

  const topIds = topResult.rows.map((r) => r.id);

  // Fetch replies for these top-level comments
  let replies: AgentCommentWithUser[] = [];
  if (topIds.length > 0) {
    const repliesResult = await query<AgentCommentWithUser>(
      `SELECT c.*, u.nickname, u.avatar_url, 0::int AS reply_count
         FROM agent_comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.parent_id = ANY($1::uuid[])
          AND c.is_deleted = false
        ORDER BY c.created_at ASC`,
      [topIds],
    );
    replies = repliesResult.rows;
  }

  return {
    comments: topResult.rows,
    replies,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findById(id: string): Promise<AgentComment | null> {
  const result = await query<AgentComment>(
    'SELECT * FROM agent_comments WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateComment(input: {
  id: string;
  user_id: string;
  is_admin: boolean;
  body: string;
}): Promise<void> {
  const body = validateBody(input.body);

  const existing = await findById(input.id);
  if (!existing || existing.is_deleted) throw new Error('댓글을 찾을 수 없습니다');
  if (!input.is_admin && existing.user_id !== input.user_id) {
    throw new Error('본인 댓글만 수정할 수 있습니다');
  }

  await query(
    `UPDATE agent_comments SET body = $1, updated_at = now() WHERE id = $2`,
    [body, input.id],
  );
}

export async function deleteComment(input: {
  id: string;
  user_id: string;
  is_admin: boolean;
}): Promise<void> {
  const existing = await findById(input.id);
  if (!existing || existing.is_deleted) throw new Error('댓글을 찾을 수 없습니다');
  if (!input.is_admin && existing.user_id !== input.user_id) {
    throw new Error('본인 댓글만 삭제할 수 있습니다');
  }

  // Soft delete — replace body so UI can show placeholder
  await query(
    `UPDATE agent_comments
        SET is_deleted = true,
            body = '[삭제된 댓글]',
            updated_at = now()
      WHERE id = $1`,
    [input.id],
  );
}
