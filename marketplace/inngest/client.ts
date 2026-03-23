import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'cryptointel-marketplace',
});

// Event types for type-safe event publishing
export type MarketplaceEvents = {
  'marketplace/job.created': { data: { jobId: string; agentId: string; serviceId: string; buyerId: string } };
  'marketplace/job.completed': { data: { jobId: string; agentId: string; buyerId: string; amount: number } };
  'marketplace/agent.created': { data: { agentId: string; description: string } };
  'marketplace/agent.updated': { data: { agentId: string; description?: string } };
  'marketplace/bounty.created': { data: { bountyId: string; category: string; tags: string[] } };
  'marketplace/payment.deposited': { data: { userId: string; amount: number; txHash: string } };
  'marketplace/subscription.created': { data: { subscriptionId: string; userId: string; agentId: string } };
};
