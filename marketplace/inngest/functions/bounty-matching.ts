import { inngest } from '../client';
import { query } from '@/lib/db/pool';

/**
 * Bounty matching — 10분 cron + bounty 생성 시 즉시 트리거 (이벤트 'bounty/created').
 *
 * 정본: docs/PRD-OpenAgentX.md §4.9 (결정 21).
 *
 * 알고리즘 (PRD v2.2 §4.1.2):
 *   1. category + tags로 1차 필터링
 *   2. success_rate × rating × (1 - price_normalized) 정렬
 *   3. 상위 3개 후보를 bounty_candidates 테이블에 INSERT
 *   4. bounty.status = 'pending_match'로 갱신
 *
 * 후보가 0개면 bounty.status = 'no_match' (UI에서 사용자가 수동으로 에이전트 직접 검색 권유).
 */

interface OpenBounty {
  id: string;
  category: string;
  tags: string[];
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  created_at: string;
}

interface AgentCandidate {
  agent_id: string;
  score: number;
  rating: number;
  success_rate: number;
  price_avg: number;
  reasons: string[];
}

export const bountyMatching = inngest.createFunction(
  {
    id: 'bounty-matching',
    name: 'Match candidate agents to open bounties',
    concurrency: { limit: 3 },
    retries: 2,
  },
  [
    { cron: '*/10 * * * *' },        // 10분 주기
    { event: 'bounty/created' },     // 즉시 트리거 (생성 직후)
  ],
  async ({ event, step }) => {
    // 즉시 트리거인 경우 단일 bounty만 처리
    const onlyBountyId = event?.name === 'bounty/created' ? (event.data?.bounty_id as string | undefined) : undefined;

    // 1) 처리 대상 bounty 조회
    const bounties = await step.run('find-open-bounties', async () => {
      if (onlyBountyId) {
        const result = await query<OpenBounty>(
          `SELECT id, category, tags, budget_min, budget_max, currency, created_at
             FROM bounties
            WHERE id = $1 AND status = 'open'`,
          [onlyBountyId],
        );
        return result.rows;
      }
      const result = await query<OpenBounty>(
        `SELECT id, category, tags, budget_min, budget_max, currency, created_at
           FROM bounties
          WHERE status = 'open'
            AND created_at >= NOW() - INTERVAL '7 days'
          ORDER BY created_at ASC
          LIMIT 50`,
      );
      return result.rows;
    });

    let matched = 0;
    let nomatch = 0;

    // 2) 각 bounty 별 매칭
    for (const bounty of bounties) {
      const candidates = await step.run(`match-${bounty.id}`, async () => {
        return matchCandidates(bounty);
      });

      await step.run(`save-${bounty.id}`, async () => {
        if (candidates.length === 0) {
          await query(
            `UPDATE bounties SET status = 'no_match', updated_at = NOW() WHERE id = $1`,
            [bounty.id],
          );
          return;
        }

        // 기존 후보 정리 후 재삽입 (재매칭 시)
        await query(`DELETE FROM bounty_candidates WHERE bounty_id = $1`, [bounty.id]);
        for (let i = 0; i < candidates.length; i += 1) {
          const c = candidates[i];
          await query(
            `INSERT INTO bounty_candidates (bounty_id, agent_id, rank, score, reasons, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [bounty.id, c.agent_id, i + 1, c.score, JSON.stringify(c.reasons)],
          );
        }
        await query(
          `UPDATE bounties SET status = 'pending_match', matched_count = $2, updated_at = NOW() WHERE id = $1`,
          [bounty.id, candidates.length],
        );
      });

      if (candidates.length > 0) matched += 1;
      else nomatch += 1;
    }

    return {
      bounties_processed: bounties.length,
      matched,
      no_match: nomatch,
      trigger: onlyBountyId ? 'event' : 'cron',
    };
  },
);

/**
 * 매칭 알고리즘 본체.
 *
 * 1차 필터: agents.category = bounty.category AND tags ∩ bounty.tags ≠ ∅
 * 점수: success_rate × 0.5 + rating/5 × 0.3 + (1 - price_norm) × 0.2
 *   price_norm: 카테고리 평균 가격 대비 본 에이전트 평균 가격.
 *
 * 상위 3개 반환. 동점 시 created_at(오래된 것 우선) tiebreak.
 */
async function matchCandidates(bounty: OpenBounty): Promise<AgentCandidate[]> {
  // 카테고리 평균 가격
  const { rows: avgRows } = await query<{ avg_price: number }>(
    `SELECT COALESCE(AVG(price_avg), 0)::float AS avg_price
       FROM agents
      WHERE category = $1 AND status = 'active'`,
    [bounty.category],
  );
  const categoryAvg = avgRows[0]?.avg_price ?? 0;

  // 1차 필터: 카테고리 + 태그 교집합
  const tagsArr = bounty.tags ?? [];
  const { rows } = await query<{
    id: string;
    rating: number;
    success_rate: number;
    price_avg: number;
    tag_overlap: number;
  }>(
    `SELECT a.id,
            COALESCE(a.rating, 0)::float AS rating,
            COALESCE(a.success_rate, 0.5)::float AS success_rate,
            COALESCE(a.price_avg, 0)::float AS price_avg,
            COALESCE(cardinality(ARRAY(
              SELECT UNNEST(a.tags) INTERSECT SELECT UNNEST($2::text[])
            )), 0) AS tag_overlap
       FROM agents a
      WHERE a.category = $1
        AND a.status = 'active'
        AND ($3::float IS NULL OR a.price_avg <= $3::float * 1.2)`,
    [bounty.category, tagsArr, bounty.budget_max],
  );

  const candidates: AgentCandidate[] = rows
    .filter((r) => tagsArr.length === 0 || r.tag_overlap > 0)
    .map((r) => {
      const priceNorm = categoryAvg > 0 ? Math.min(1, r.price_avg / categoryAvg) : 0;
      const score =
        r.success_rate * 0.5 + (r.rating / 5) * 0.3 + (1 - priceNorm) * 0.2;
      const reasons: string[] = [];
      if (r.success_rate >= 0.9) reasons.push('high_success_rate');
      if (r.rating >= 4.5) reasons.push('top_rated');
      if (r.tag_overlap > 0) reasons.push(`tag_match:${r.tag_overlap}`);
      if (priceNorm < 0.8) reasons.push('budget_friendly');
      return {
        agent_id: r.id,
        score: Math.round(score * 1000) / 1000,
        rating: r.rating,
        success_rate: r.success_rate,
        price_avg: r.price_avg,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return candidates;
}
