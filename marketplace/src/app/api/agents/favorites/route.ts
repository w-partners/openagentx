import { NextRequest } from 'next/server';
import { query } from '@/lib/db/pool';
import { apiJson, requireAuth, AuthError } from '@/lib/utils/api-response';

// GET /api/agents/favorites — Current user's favorited agents (with agent details)
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const result = await query(
      `SELECT a.id, a.name, a.slug, a.description, a.description_ko, a.category, a.tags,
              a.avg_rating, a.total_reviews, a.total_jobs, a.logo_url, a.status,
              f.created_at AS favorited_at
       FROM favorites f
       JOIN agents a ON a.id = f.agent_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId],
    );
    return apiJson({ data: result.rows });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiJson({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
}
