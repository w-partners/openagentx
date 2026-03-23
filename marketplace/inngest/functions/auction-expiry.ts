import { inngest } from '../client';
import { expireAuctions, refundBidsForAuction } from '../../src/lib/db/repositories/auctions';
import { query } from '../../src/lib/db/pool';
import { getConfig } from '../../src/lib/db/repositories/rewards';

export const auctionExpiry = inngest.createFunction(
  { id: 'auction-expiry' },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    // Step 1: Expire auctions past their deadline
    const expiredCount = await step.run('expire-auctions', async () => {
      return await expireAuctions();
    });

    if (expiredCount === 0) {
      return { expired: 0, refunded: 0 };
    }

    // Step 2: Check if refund is enabled
    const shouldRefund = await step.run('check-refund-config', async () => {
      const config = await getConfig();
      return (config.auction_refund_on_expiry ?? 0) > 0;
    });

    let refundedTotal = 0;

    if (shouldRefund) {
      // Step 3: Find recently expired auctions and refund bid fees
      const expiredAuctions = await step.run('find-expired-auctions', async () => {
        const result = await query<{ id: string }>(
          "SELECT id FROM auction_requests WHERE status = 'expired' AND updated_at > NOW() - INTERVAL '2 hours'",
        );
        return result.rows.map((r) => r.id);
      });

      for (const auctionId of expiredAuctions) {
        const count = await step.run(`refund-${auctionId}`, async () => {
          return await refundBidsForAuction(auctionId);
        });
        refundedTotal += count;
      }
    }

    return { expired: expiredCount, refunded: refundedTotal };
  },
);
