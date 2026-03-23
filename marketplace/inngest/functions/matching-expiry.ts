import { inngest } from '../client';
import { expireRequests } from '../../src/lib/db/repositories/matching';

export const matchingExpiry = inngest.createFunction(
  { id: 'matching-expiry' },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    const expiredCount = await step.run('expire-matching-requests', async () => {
      return await expireRequests();
    });

    return { expired: expiredCount };
  },
);
