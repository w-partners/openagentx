import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { recalculateRanking } from './agents';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';

// --- Types ---

export interface Review {
  id: string;
  job_id: string;
  agent_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewWithUser extends Review {
  reviewer_nickname: string;
  reviewer_avatar_url: string | null;
}

// --- Constants ---

const MIN_RATING = 1;
const MAX_RATING = 5;

// --- Repository ---

export async function createReview(input: {
  job_id: string;
  agent_id: string;
  reviewer_id: string;
  rating: number;
  comment?: string;
}): Promise<string> {
  const { job_id, agent_id, reviewer_id, rating, comment } = input;

  if (rating < MIN_RATING || rating > MAX_RATING || !Number.isInteger(rating)) {
    throw new Error('평점은 1~5 사이의 정수여야 합니다');
  }

  return await transaction(async (client: PoolClient) => {
    // Verify: job must exist, be completed, and reviewer must be the buyer
    const jobResult = await client.query(
      `SELECT id, buyer_id, agent_id, status
       FROM marketplace_jobs
       WHERE id = $1`,
      [job_id],
    );

    if (jobResult.rowCount === 0) {
      throw new Error('작업을 찾을 수 없습니다');
    }

    const job = jobResult.rows[0];

    if (job.status !== 'completed') {
      throw new Error('완료된 작업에만 리뷰를 작성할 수 있습니다');
    }

    if (job.buyer_id !== reviewer_id) {
      throw new Error('구매자만 리뷰를 작성할 수 있습니다');
    }

    if (job.agent_id !== agent_id) {
      throw new Error('해당 작업의 에이전트가 일치하지 않습니다');
    }

    // Check duplicate review
    const existingReview = await client.query(
      'SELECT id FROM reviews WHERE job_id = $1 AND reviewer_id = $2',
      [job_id, reviewer_id],
    );

    if (existingReview.rowCount !== null && existingReview.rowCount > 0) {
      throw new Error('이미 이 작업에 대한 리뷰를 작성했습니다');
    }

    // Insert review
    const reviewResult = await client.query<{ id: string }>(
      `INSERT INTO reviews (job_id, agent_id, reviewer_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [job_id, agent_id, reviewer_id, rating, comment ?? null],
    );

    const reviewId = reviewResult.rows[0].id;

    // Recalculate agent avg_rating and total_reviews
    await client.query(
      `UPDATE agents SET
         avg_rating = COALESCE(
           (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE agent_id = $1), 0
         ),
         total_reviews = (SELECT COUNT(*) FROM reviews WHERE agent_id = $1)
       WHERE id = $1`,
      [agent_id],
    );

    return reviewId;
  });

  // Note: ranking recalculation happens inside transaction via agents table update
}

export async function findByAgent(
  agentId: string,
  options: {
    sort?: 'created_at' | 'rating';
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ reviews: ReviewWithUser[]; total: number }> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = options.offset ?? 0;
  const sort = options.sort ?? 'created_at';

  const [dataResult, countResult] = await Promise.all([
    query<ReviewWithUser>(
      `SELECT r.*, u.nickname AS reviewer_nickname, u.avatar_url AS reviewer_avatar_url
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.agent_id = $1
       ORDER BY r.${sort} DESC
       LIMIT $2 OFFSET $3`,
      [agentId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM reviews WHERE agent_id = $1',
      [agentId],
    ),
  ]);

  return {
    reviews: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findByReviewer(
  reviewerId: string,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
): Promise<Review[]> {
  const result = await query<Review>(
    `SELECT * FROM reviews WHERE reviewer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [reviewerId, Math.min(limit, MAX_PAGE_SIZE), offset],
  );
  return result.rows;
}

export async function recalculateAgentRating(agentId: string): Promise<void> {
  await query(
    `UPDATE agents SET
       avg_rating = COALESCE(
         (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE agent_id = $1), 0
       ),
       total_reviews = (SELECT COUNT(*) FROM reviews WHERE agent_id = $1)
     WHERE id = $1`,
    [agentId],
  );
  await recalculateRanking(agentId);
}
