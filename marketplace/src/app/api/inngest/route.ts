import { serve } from 'inngest/next';
import { inngest } from '../../../../inngest/client';
import { jobExecution } from '../../../../inngest/functions/job-execution';
import { bountyMatching } from '../../../../inngest/functions/bounty-matching';
import { subscriptionCheck } from '../../../../inngest/functions/subscription-check';
import { qualityImprovement } from '../../../../inngest/functions/quality-improvement';
import { auctionExpiry } from '../../../../inngest/functions/auction-expiry';
import { matchingExpiry } from '../../../../inngest/functions/matching-expiry';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [jobExecution, bountyMatching, subscriptionCheck, qualityImprovement, auctionExpiry, matchingExpiry],
});
