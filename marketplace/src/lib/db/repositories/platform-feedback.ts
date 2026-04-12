import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';

// ─── Types ───

export type FeedbackCategory = 'feature' | 'bug' | 'improvement' | 'general';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface PlatformFeedback {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  title: string;
  body: string;
  status: FeedbackStatus;
  upvote_count: number;
  admin_response: string | null;
  admin_response_at: Date | null;
  admin_response_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlatformFeedbackWithUser extends PlatformFeedback {
  author_nickname: string;
  author_avatar_url: string | null;
  has_voted?: boolean;
}

const VALID_CATEGORIES: FeedbackCategory[] = ['feature', 'bug', 'improvement', 'general'];
const VALID_STATUSES: FeedbackStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const MAX_TITLE = 200;
const MAX_BODY = 5000;

// ─── Repository ───

export async function createFeedback(input: {
  user_id: string;
  category: FeedbackCategory;
  title: string;
  body: string;
}): Promise<string> {
  if (!VALID_CATEGORIES.includes(input.category)) {
    throw new Error('유효하지 않은 카테고리입니다');
  }
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length === 0 || title.length > MAX_TITLE) {
    throw new Error(`제목은 1~${MAX_TITLE}자 사이여야 합니다`);
  }
  if (body.length === 0 || body.length > MAX_BODY) {
    throw new Error(`본문은 1~${MAX_BODY}자 사이여야 합니다`);
  }

  const result = await query<{ id: string }>(
    `INSERT INTO platform_feedback (user_id, category, title, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.user_id, input.category, title, body],
  );
  return result.rows[0].id;
}

export async function listFeedback(options: {
  category?: FeedbackCategory;
  status?: FeedbackStatus;
  sort?: 'votes' | 'recent';
  limit?: number;
  offset?: number;
  viewer_id?: string | null;
} = {}): Promise<{ items: PlatformFeedbackWithUser[]; total: number }> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = options.offset ?? 0;

  const conditions: string[] = ['1=1'];
  const values: unknown[] = [];
  let idx = 1;

  if (options.category) {
    conditions.push(`f.category = $${idx++}`);
    values.push(options.category);
  }
  if (options.status) {
    conditions.push(`f.status = $${idx++}`);
    values.push(options.status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderBy = options.sort === 'recent'
    ? 'f.created_at DESC'
    : 'f.upvote_count DESC, f.created_at DESC';

  // Snapshot the filter values for the count query before appending extras.
  const filterValues = [...values];

  const viewerId = options.viewer_id ?? null;
  const viewerIdx = idx++;
  values.push(viewerId);

  const limitIdx = idx++;
  const offsetIdx = idx++;
  values.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    query<PlatformFeedbackWithUser>(
      `SELECT f.*,
              u.nickname AS author_nickname,
              u.avatar_url AS author_avatar_url,
              CASE
                WHEN $${viewerIdx}::uuid IS NULL THEN false
                ELSE EXISTS (
                  SELECT 1 FROM platform_feedback_votes v
                   WHERE v.feedback_id = f.id AND v.user_id = $${viewerIdx}::uuid
                )
              END AS has_voted
         FROM platform_feedback f
         JOIN users u ON u.id = f.user_id
         ${where}
         ORDER BY ${orderBy}
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM platform_feedback f ${where}`,
      filterValues,
    ),
  ]);

  return {
    items: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function getFeedback(
  id: string,
  viewerId: string | null = null,
): Promise<PlatformFeedbackWithUser | null> {
  const result = await query<PlatformFeedbackWithUser>(
    `SELECT f.*,
            u.nickname AS author_nickname,
            u.avatar_url AS author_avatar_url,
            CASE
              WHEN $2::uuid IS NULL THEN false
              ELSE EXISTS (
                SELECT 1 FROM platform_feedback_votes v
                 WHERE v.feedback_id = f.id AND v.user_id = $2::uuid
              )
            END AS has_voted
       FROM platform_feedback f
       JOIN users u ON u.id = f.user_id
      WHERE f.id = $1`,
    [id, viewerId],
  );
  return result.rows[0] ?? null;
}

export async function updateStatus(input: {
  id: string;
  status: FeedbackStatus;
}): Promise<void> {
  if (!VALID_STATUSES.includes(input.status)) {
    throw new Error('유효하지 않은 상태입니다');
  }
  const result = await query(
    `UPDATE platform_feedback
        SET status = $1, updated_at = now()
      WHERE id = $2`,
    [input.status, input.id],
  );
  if (result.rowCount === 0) throw new Error('피드백을 찾을 수 없습니다');
}

export async function addAdminResponse(input: {
  id: string;
  admin_id: string;
  response: string;
  status?: FeedbackStatus;
}): Promise<void> {
  const response = input.response.trim();
  if (response.length === 0 || response.length > MAX_BODY) {
    throw new Error('응답 내용을 입력하세요');
  }

  const newStatus = input.status && VALID_STATUSES.includes(input.status) ? input.status : null;

  const sets: string[] = [
    'admin_response = $1',
    'admin_response_at = now()',
    'admin_response_by = $2',
    'updated_at = now()',
  ];
  const values: unknown[] = [response, input.admin_id];
  let idx = 3;
  if (newStatus) {
    sets.push(`status = $${idx++}`);
    values.push(newStatus);
  }
  values.push(input.id);

  const result = await query(
    `UPDATE platform_feedback SET ${sets.join(', ')} WHERE id = $${idx}`,
    values,
  );
  if (result.rowCount === 0) throw new Error('피드백을 찾을 수 없습니다');
}

/**
 * Toggle vote: returns { voted, upvote_count }
 */
export async function toggleVote(
  feedbackId: string,
  userId: string,
): Promise<{ voted: boolean; upvote_count: number }> {
  return await transaction(async (client: PoolClient) => {
    const exists = await client.query(
      `SELECT 1 FROM platform_feedback_votes
        WHERE feedback_id = $1 AND user_id = $2`,
      [feedbackId, userId],
    );

    if (exists.rowCount && exists.rowCount > 0) {
      await client.query(
        `DELETE FROM platform_feedback_votes
          WHERE feedback_id = $1 AND user_id = $2`,
        [feedbackId, userId],
      );
      const upd = await client.query<{ upvote_count: number }>(
        `UPDATE platform_feedback
            SET upvote_count = GREATEST(upvote_count - 1, 0),
                updated_at = now()
          WHERE id = $1
          RETURNING upvote_count`,
        [feedbackId],
      );
      if (upd.rowCount === 0) throw new Error('피드백을 찾을 수 없습니다');
      return { voted: false, upvote_count: upd.rows[0].upvote_count };
    }

    // Verify feedback exists before insert
    const fb = await client.query('SELECT id FROM platform_feedback WHERE id = $1', [feedbackId]);
    if (fb.rowCount === 0) throw new Error('피드백을 찾을 수 없습니다');

    await client.query(
      `INSERT INTO platform_feedback_votes (feedback_id, user_id)
       VALUES ($1, $2)`,
      [feedbackId, userId],
    );
    const upd = await client.query<{ upvote_count: number }>(
      `UPDATE platform_feedback
          SET upvote_count = upvote_count + 1,
              updated_at = now()
        WHERE id = $1
        RETURNING upvote_count`,
      [feedbackId],
    );
    return { voted: true, upvote_count: upd.rows[0].upvote_count };
  });
}
