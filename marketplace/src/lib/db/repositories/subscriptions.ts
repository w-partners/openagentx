import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';

// --- Types ---

export type SubscriptionTierInterval = 'monthly' | 'yearly';

export interface SubscriptionTier {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  price_usdc: number;
  interval: SubscriptionTierInterval;
  features: string[];
  max_subscribers: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  agent_id: string;
  tier_id: string;
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  current_period_start: Date;
  current_period_end: Date;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionWithTier extends Subscription {
  tier_name: string;
  tier_price_usdc: number;
  tier_interval: SubscriptionTierInterval;
  agent_name: string;
}

// --- Tier CRUD ---

export async function createTier(input: {
  agent_id: string;
  owner_id: string;
  name: string;
  description?: string;
  price_usdc: number;
  interval: SubscriptionTierInterval;
  features?: string[];
  max_subscribers?: number;
}): Promise<string> {
  // Verify agent ownership
  const agent = await query(
    'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
    [input.agent_id, input.owner_id],
  );
  if (agent.rowCount === 0) throw new Error('에이전트를 찾을 수 없거나 권한이 없습니다');

  if (input.price_usdc <= 0) throw new Error('구독 가격은 0보다 커야 합니다');

  const result = await query<{ id: string }>(
    `INSERT INTO subscription_tiers (agent_id, name, description, price_usdc, interval, features, max_subscribers)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.agent_id,
      input.name,
      input.description ?? null,
      input.price_usdc,
      input.interval,
      input.features ?? [],
      input.max_subscribers ?? null,
    ],
  );

  return result.rows[0].id;
}

export async function updateTier(
  tierId: string,
  ownerId: string,
  updates: Partial<{
    name: string;
    description: string;
    price_usdc: number;
    features: string[];
    max_subscribers: number | null;
    is_active: boolean;
  }>,
): Promise<void> {
  // Verify ownership via agent
  const tier = await query(
    `SELECT st.id FROM subscription_tiers st
     JOIN agents a ON a.id = st.agent_id
     WHERE st.id = $1 AND a.owner_id = $2`,
    [tierId, ownerId],
  );
  if (tier.rowCount === 0) throw new Error('구독 등급을 찾을 수 없거나 권한이 없습니다');

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    price_usdc: 'price_usdc',
    features: 'features',
    max_subscribers: 'max_subscribers',
    is_active: 'is_active',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    const val = updates[key as keyof typeof updates];
    if (val !== undefined) {
      sets.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  if (sets.length === 0) return;

  values.push(tierId);
  await query(
    `UPDATE subscription_tiers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
    values,
  );
}

export async function findTiersByAgent(agentId: string): Promise<SubscriptionTier[]> {
  const result = await query<SubscriptionTier>(
    `SELECT * FROM subscription_tiers WHERE agent_id = $1 AND is_active = true ORDER BY price_usdc ASC`,
    [agentId],
  );
  return result.rows;
}

// --- Subscription management ---

export async function createSubscription(input: {
  user_id: string;
  agent_id: string;
  tier_id: string;
}): Promise<string> {
  return await transaction(async (client: PoolClient) => {
    // Verify tier exists and is active
    const tierResult = await client.query<SubscriptionTier>(
      'SELECT * FROM subscription_tiers WHERE id = $1 AND agent_id = $2 AND is_active = true',
      [input.tier_id, input.agent_id],
    );

    if (tierResult.rowCount === 0) {
      throw new Error('구독 등급을 찾을 수 없습니다');
    }

    const tier = tierResult.rows[0];

    // Check max subscribers
    if (tier.max_subscribers !== null) {
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM subscriptions
         WHERE tier_id = $1 AND status = 'active'`,
        [input.tier_id],
      );
      const currentCount = parseInt(countResult.rows[0].count, 10);
      if (currentCount >= tier.max_subscribers) {
        throw new Error('구독 한도에 도달했습니다');
      }
    }

    // Check existing active subscription for same agent
    const existing = await client.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND agent_id = $2 AND status = 'active'`,
      [input.user_id, input.agent_id],
    );

    if (existing.rowCount !== null && existing.rowCount > 0) {
      throw new Error('이미 이 에이전트에 구독 중입니다');
    }

    // Deduct balance
    const balanceResult = await client.query(
      'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING id',
      [tier.price_usdc, input.user_id],
    );

    if (balanceResult.rowCount === 0) {
      throw new Error('잔액이 부족합니다');
    }

    // Calculate period
    const periodMonths = tier.interval === 'yearly' ? 12 : 1;

    const subResult = await client.query<{ id: string }>(
      `INSERT INTO subscriptions (user_id, agent_id, tier_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, 'active', NOW(), NOW() + INTERVAL '${periodMonths} months')
       RETURNING id`,
      [input.user_id, input.agent_id, input.tier_id],
    );

    // Credit agent owner
    await client.query(
      `UPDATE users SET balance_usdc = balance_usdc + $1
       WHERE id = (SELECT owner_id FROM agents WHERE id = $2)`,
      [tier.price_usdc, input.agent_id],
    );

    return subResult.rows[0].id;
  });
}

export async function cancelSubscription(
  subscriptionId: string,
  userId: string,
): Promise<void> {
  const result = await query(
    `UPDATE subscriptions SET
       status = 'cancelled',
       cancelled_at = NOW(),
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [subscriptionId, userId],
  );

  if (result.rowCount === 0) {
    throw new Error('구독을 찾을 수 없거나 이미 취소되었습니다');
  }
}

export async function checkActive(
  userId: string,
  agentId: string,
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM subscriptions
     WHERE user_id = $1 AND agent_id = $2 AND status = 'active'
       AND current_period_end > NOW()`,
    [userId, agentId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function findByUser(
  userId: string,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
): Promise<SubscriptionWithTier[]> {
  const result = await query<SubscriptionWithTier>(
    `SELECT s.*, st.name AS tier_name, st.price_usdc AS tier_price_usdc,
            st.interval AS tier_interval, a.name AS agent_name
     FROM subscriptions s
     JOIN subscription_tiers st ON st.id = s.tier_id
     JOIN agents a ON a.id = s.agent_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, Math.min(limit, MAX_PAGE_SIZE), offset],
  );
  return result.rows;
}

export async function findByAgent(
  agentId: string,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
): Promise<{ subscriptions: Subscription[]; total: number }> {
  const [dataResult, countResult] = await Promise.all([
    query<Subscription>(
      `SELECT * FROM subscriptions WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [agentId, Math.min(limit, MAX_PAGE_SIZE), offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM subscriptions WHERE agent_id = $1`,
      [agentId],
    ),
  ]);

  return {
    subscriptions: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}
