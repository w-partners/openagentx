import { query } from '../db/pool';
import { getOrFetch } from '../cache/redis';
import type { Agent } from '../db/repositories/agents';

const SEARCH_CACHE_TTL = 60; // 1 minute
const DEFAULT_ALPHA = 0.4; // BM25 weight (0.6 for vector)

interface SearchParams {
  q: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  embedding?: number[]; // Pre-computed query embedding
}

interface SearchResult {
  agents: (Agent & { search_score: number })[];
  total: number;
}

/**
 * Hybrid search: BM25 (tsvector) + pgvector (cosine similarity) + metric reranking
 *
 * Pipeline:
 * 1. Cluster filter (category, status, price)
 * 2. BM25 keyword match (ts_rank)
 * 3. Vector similarity (1 - cosine distance) — when embedding provided
 * 4. Hybrid score = alpha * bm25 + (1-alpha) * cosine
 * 5. Metric reranking: score * (1 + 0.1*log(jobs+1)) * (1 + 0.2*rating/5)
 */
export async function hybridSearch(params: SearchParams): Promise<SearchResult> {
  const { q, category, limit = 20, offset = 0, embedding } = params;
  const cacheKey = `p2:search:${q}:${category ?? 'all'}:${offset}:${limit}`;

  return getOrFetch<SearchResult>(cacheKey, SEARCH_CACHE_TTL, async () => {
    const conditions: string[] = ["a.status = 'active'"];
    const values: unknown[] = [];
    let idx = 1;

    if (category) {
      conditions.push(`a.category = $${idx++}`);
      values.push(category);
    }

    const where = conditions.join(' AND ');

    // Build score expression
    let scoreExpr: string;

    if (embedding && embedding.length === 1536) {
      // Hybrid: BM25 + vector (embedding passed as parameterized value)
      const embeddingParam = `$${idx++}`;
      scoreExpr = `(
        ${DEFAULT_ALPHA} * COALESCE(ts_rank(a.search_vector, plainto_tsquery('simple', $${idx})), 0) +
        ${1 - DEFAULT_ALPHA} * COALESCE(1 - (a.description_embedding <=> ${embeddingParam}::vector), 0)
      )`;
      values.push(`[${embedding.join(',')}]`);
      values.push(q);
      idx++;
    } else {
      // BM25 only
      scoreExpr = `ts_rank(a.search_vector, plainto_tsquery('simple', $${idx}))`;
      values.push(q);
      idx++;
    }

    // Metric reranking multiplier
    const rerankExpr = `(1 + 0.1 * LN(a.total_jobs + 1)) * (1 + 0.2 * a.avg_rating / 5.0)`;

    const finalScore = `(${scoreExpr}) * ${rerankExpr}`;

    const [dataResult, countResult] = await Promise.all([
      query<Agent & { search_score: number }>(
        `SELECT a.*, (${finalScore}) AS search_score
         FROM agents a
         WHERE ${where}
           AND (a.search_vector @@ plainto_tsquery('simple', $${idx - 1}) OR $${idx - 1} = '')
         ORDER BY search_score DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM agents a
         WHERE ${where}
           AND (a.search_vector @@ plainto_tsquery('simple', $${idx - 2}) OR $${idx - 2} = '')`,
        values,
      ),
    ]);

    return {
      agents: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  });
}
