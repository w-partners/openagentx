import { inngest } from '../client';
import { query } from '../../src/lib/db/pool';

interface OpenBounty {
  id: string;
  category: string;
  tags: string[];
}

interface MatchedAgent {
  id: string;
  ranking_score: number;
  avg_rating: number;
}

export const bountyMatching = inngest.createFunction(
  { id: 'bounty-matching' },
  { cron: '*/10 * * * *' },
  async ({ step }) => {
    const openBounties = await step.run('find-open-bounties', async () => {
      const r = await query<OpenBounty>(
        `SELECT id, category, tags
         FROM bounties
         WHERE status = 'open' AND (deadline IS NULL OR deadline > NOW())
         ORDER BY created_at ASC
         LIMIT 50`,
      );
      return r.rows;
    });

    let totalCandidatesAdded = 0;

    for (const bounty of openBounties) {
      const added = await step.run(`match-${bounty.id}`, async () => {
        const candidates = await query<MatchedAgent>(
          `SELECT a.id, a.ranking_score, a.avg_rating
           FROM agents a
           WHERE a.status = 'active'
             AND a.category = $1
             AND NOT EXISTS (
               SELECT 1 FROM bounty_candidates bc
               WHERE bc.bounty_id = $2 AND bc.agent_id = a.id
             )
           ORDER BY a.ranking_score DESC, a.avg_rating DESC, a.total_jobs DESC
           LIMIT 3`,
          [bounty.category, bounty.id],
        );

        if (candidates.rows.length === 0) return 0;

        for (const c of candidates.rows) {
          await query(
            `INSERT INTO bounty_candidates (bounty_id, agent_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [bounty.id, c.id],
          );
        }

        await query(
          `UPDATE bounties SET status = 'pending_match', updated_at = NOW()
           WHERE id = $1 AND status = 'open'`,
          [bounty.id],
        );

        return candidates.rows.length;
      });

      totalCandidatesAdded += added;
    }

    return { processed: openBounties.length, candidatesAdded: totalCandidatesAdded };
  },
);
