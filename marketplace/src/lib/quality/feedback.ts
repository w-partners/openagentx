/**
 * 응답 품질 피드백 수집 및 분석
 * response_feedback 테이블 기반으로 피드백 저장, 통계, 재사용률 조회
 */
import { query } from '../db/pool';

export interface FeedbackData {
  jobId?: string;
  fulfillQuery?: string;
  agentId?: string;
  serviceName?: string;
  rating: number;
  isReuse?: boolean;
  responseProvider?: string;
  responseCategory?: string;
  feedbackSource?: 'api' | 'ui' | 'agent';
}

export interface FeedbackStats {
  avgRating: number;
  totalFeedback: number;
  byCategory: { category: string; avgRating: number; count: number }[];
  byProvider: { provider: string; avgRating: number; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
}

export interface LowRatedResponse {
  id: string;
  fulfillQuery: string;
  rating: number;
  responseProvider: string;
  responseCategory: string;
  agentId: string | null;
  createdAt: Date;
}

/**
 * 피드백 저장
 */
export async function submitFeedback(data: FeedbackData): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO response_feedback
       (job_id, fulfill_query, agent_id, service_name, rating, is_reuse,
        response_provider, response_category, feedback_source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      data.jobId ?? null,
      data.fulfillQuery ?? null,
      data.agentId ?? null,
      data.serviceName ?? null,
      data.rating,
      data.isReuse ?? false,
      data.responseProvider ?? null,
      data.responseCategory ?? null,
      data.feedbackSource ?? 'api',
    ],
  );
  return result.rows[0].id;
}

/**
 * 피드백 통계 조회
 */
export async function getFeedbackStats(agentId?: string): Promise<FeedbackStats> {
  const agentFilter = agentId ? 'WHERE agent_id = $1' : '';
  const params = agentId ? [agentId] : [];

  // 전체 평균 및 총 수
  const overall = await query<{ avg_rating: string; total: string }>(
    `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total
     FROM response_feedback ${agentFilter}`,
    params,
  );

  // 카테고리별 통계
  const byCategory = await query<{ category: string; avg_rating: string; count: string }>(
    `SELECT response_category as category,
            ROUND(AVG(rating)::numeric, 2) as avg_rating,
            COUNT(*) as count
     FROM response_feedback
     ${agentFilter ? agentFilter + ' AND' : 'WHERE'} response_category IS NOT NULL
     GROUP BY response_category
     ORDER BY avg_rating ASC`,
    params,
  );

  // 프로바이더별 통계
  const byProvider = await query<{ provider: string; avg_rating: string; count: string }>(
    `SELECT response_provider as provider,
            ROUND(AVG(rating)::numeric, 2) as avg_rating,
            COUNT(*) as count
     FROM response_feedback
     ${agentFilter ? agentFilter + ' AND' : 'WHERE'} response_provider IS NOT NULL
     GROUP BY response_provider
     ORDER BY avg_rating DESC`,
    params,
  );

  // 평점 분포
  const distribution = await query<{ rating: number; count: string }>(
    `SELECT rating, COUNT(*) as count
     FROM response_feedback ${agentFilter}
     GROUP BY rating
     ORDER BY rating`,
    params,
  );

  return {
    avgRating: parseFloat(overall.rows[0].avg_rating) || 0,
    totalFeedback: parseInt(overall.rows[0].total) || 0,
    byCategory: byCategory.rows.map((r) => ({
      category: r.category,
      avgRating: parseFloat(r.avg_rating),
      count: parseInt(r.count),
    })),
    byProvider: byProvider.rows.map((r) => ({
      provider: r.provider,
      avgRating: parseFloat(r.avg_rating),
      count: parseInt(r.count),
    })),
    ratingDistribution: distribution.rows.map((r) => ({
      rating: r.rating,
      count: parseInt(r.count),
    })),
  };
}

/**
 * 재사용률 조회 — 같은 클라이언트가 다시 요청하는 비율
 */
export async function getReusageRate(agentId?: string): Promise<{
  totalResponses: number;
  reusedResponses: number;
  reusageRate: number;
}> {
  const agentFilter = agentId ? 'WHERE agent_id = $1' : '';
  const params = agentId ? [agentId] : [];

  const result = await query<{ total: string; reused: string }>(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_reuse = true) as reused
     FROM response_feedback ${agentFilter}`,
    params,
  );

  const total = parseInt(result.rows[0].total) || 0;
  const reused = parseInt(result.rows[0].reused) || 0;

  return {
    totalResponses: total,
    reusedResponses: reused,
    reusageRate: total > 0 ? Math.round((reused / total) * 100) : 0,
  };
}

/**
 * 낮은 평점의 응답 조회 — 개선 대상
 */
export async function getLowRatedResponses(
  threshold: number = 3,
  limit: number = 50,
): Promise<LowRatedResponse[]> {
  const result = await query<{
    id: string;
    fulfill_query: string;
    rating: number;
    response_provider: string;
    response_category: string;
    agent_id: string | null;
    created_at: Date;
  }>(
    `SELECT id, fulfill_query, rating, response_provider, response_category,
            agent_id, created_at
     FROM response_feedback
     WHERE rating <= $1 AND fulfill_query IS NOT NULL
     ORDER BY created_at DESC
     LIMIT $2`,
    [threshold, limit],
  );

  return result.rows.map((r) => ({
    id: r.id,
    fulfillQuery: r.fulfill_query,
    rating: r.rating,
    responseProvider: r.response_provider,
    responseCategory: r.response_category,
    agentId: r.agent_id,
    createdAt: r.created_at,
  }));
}

/**
 * 카테고리별 개선이 필요한 항목 조회
 * 피드백 10개 이상, 평균 평점 threshold 이하
 */
export async function getCategoriesNeedingImprovement(
  ratingThreshold: number = 3.0,
  minFeedback: number = 10,
): Promise<{ category: string; avgRating: number; count: number }[]> {
  const result = await query<{ category: string; avg_rating: string; count: string }>(
    `SELECT response_category as category,
            ROUND(AVG(rating)::numeric, 2) as avg_rating,
            COUNT(*) as count
     FROM response_feedback
     WHERE response_category IS NOT NULL
     GROUP BY response_category
     HAVING COUNT(*) >= $1 AND AVG(rating) <= $2
     ORDER BY avg_rating ASC`,
    [minFeedback, ratingThreshold],
  );

  return result.rows.map((r) => ({
    category: r.category,
    avgRating: parseFloat(r.avg_rating),
    count: parseInt(r.count),
  }));
}
