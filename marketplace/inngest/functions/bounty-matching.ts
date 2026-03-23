import { inngest } from '../client';

export const bountyMatching = inngest.createFunction(
  { id: 'bounty-matching' },
  { cron: '*/10 * * * *' }, // Every 10 minutes
  async ({ step }) => {
    // Step 1: Find open bounties
    const openBounties = await step.run('find-open-bounties', async () => {
      // TODO: SELECT * FROM bounties WHERE status = 'open'
      return [] as Array<{ id: string; category: string; tags: string[] }>;
    });

    // Step 2: Match candidates for each bounty
    for (const bounty of openBounties) {
      await step.run(`match-${bounty.id}`, async () => {
        // TODO: Find top 3 agents by category + tags + rating + success rate
        // TODO: Insert into bounty_candidates
        // TODO: Update bounty status to 'pending_match'
      });
    }

    return { processed: (openBounties as unknown[]).length };
  },
);
