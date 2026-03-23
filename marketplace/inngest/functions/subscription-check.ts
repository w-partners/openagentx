import { inngest } from '../client';

export const subscriptionCheck = inngest.createFunction(
  { id: 'subscription-expiry-check' },
  { cron: '0 0 * * *' }, // Daily at midnight
  async ({ step }) => {
    // Step 1: Find expired subscriptions
    const expired = await step.run('find-expired', async () => {
      // TODO: SELECT * FROM subscriptions WHERE status = 'active' AND expires_at < NOW()
      // TODO: UPDATE status = 'expired'
      return { count: 0 };
    });

    // Step 2: Notify users of upcoming expirations (within 3 days)
    await step.run('notify-upcoming', async () => {
      // TODO: SELECT * FROM subscriptions WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      // TODO: Send notification
    });

    return expired;
  },
);
