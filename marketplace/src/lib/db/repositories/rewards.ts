import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { notifySafe } from '../../telegram/notifications';

// --- Types ---

export interface RewardConfig {
  [key: string]: number;
}

export interface RewardHistory {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  source_user_id: string | null;
  source_job_id: string | null;
  referral_level: number | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface RewardStats {
  totalEarned: number;
  byType: { type: string; total: number; count: number }[];
}

// --- Config ---

export async function getConfig(): Promise<RewardConfig> {
  const result = await query<{ id: string; value: string }>(
    'SELECT id, value FROM reward_config',
  );
  const config: RewardConfig = {};
  for (const row of result.rows) {
    config[row.id] = parseFloat(row.value);
  }
  return config;
}

export async function getConfigWithDescriptions(): Promise<
  { id: string; value: number; description: string | null; updated_at: Date }[]
> {
  const result = await query<{
    id: string;
    value: string;
    description: string | null;
    updated_at: Date;
  }>('SELECT * FROM reward_config ORDER BY id');
  return result.rows.map((r) => ({ ...r, value: parseFloat(r.value) }));
}

export async function updateConfig(id: string, value: number): Promise<void> {
  const result = await query(
    'UPDATE reward_config SET value = $1, updated_at = NOW() WHERE id = $2',
    [value, id],
  );
  if (result.rowCount === 0) {
    throw new Error(`설정 항목을 찾을 수 없습니다: ${id}`);
  }
}

// --- Referral Chain Processing ---

export async function processReferralChain(
  buyerId: string,
  purchaseAmount: number,
  jobId: string,
): Promise<void> {
  const cfg = await getConfig();
  const maxDepth = Math.min(cfg.max_referral_depth ?? 3, 3);

  const rateKeys = [
    'referral_level1_rate',
    'referral_level2_rate',
    'referral_level3_rate',
  ];

  await transaction(async (client: PoolClient) => {
    let currentUserId = buyerId;

    for (let level = 1; level <= maxDepth; level++) {
      // Find referrer of current user
      const ref = await client.query<{ referred_by: string | null }>(
        'SELECT referred_by FROM users WHERE id = $1',
        [currentUserId],
      );

      const referrerId = ref.rows[0]?.referred_by;
      if (!referrerId) break; // No more referrers in chain

      const rate = cfg[rateKeys[level - 1]] ?? 0;
      if (rate <= 0) {
        currentUserId = referrerId;
        continue;
      }

      const rewardAmount = parseFloat((purchaseAmount * rate).toFixed(4));
      if (rewardAmount <= 0) {
        currentUserId = referrerId;
        continue;
      }

      // Record reward
      await client.query(
        `INSERT INTO reward_history
           (user_id, type, amount, source_user_id, source_job_id, referral_level, metadata)
         VALUES ($1, 'referral_commission', $2, $3, $4, $5, $6)`,
        [
          referrerId,
          rewardAmount,
          buyerId,
          jobId,
          level,
          JSON.stringify({ purchase_amount: purchaseAmount, rate }),
        ],
      );

      // Credit referrer balance
      await client.query(
        'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
        [rewardAmount, referrerId],
      );

      // Notify referrer about earning
      notifySafe(referrerId, {
        type: 'earning',
        amount: rewardAmount,
        source: `추천 수수료 (레벨 ${level})`,
      });

      currentUserId = referrerId;
    }
  });
}

// --- Purchase Cashback ---

export async function processPurchaseCashback(
  buyerId: string,
  purchaseAmount: number,
  jobId: string,
): Promise<void> {
  const cfg = await getConfig();
  const rate = cfg.purchase_cashback_rate ?? 0;
  if (rate <= 0) return;

  const cashbackAmount = parseFloat((purchaseAmount * rate).toFixed(4));
  if (cashbackAmount <= 0) return;

  await transaction(async (client: PoolClient) => {
    await client.query(
      `INSERT INTO reward_history
         (user_id, type, amount, source_job_id, metadata)
       VALUES ($1, 'purchase_cashback', $2, $3, $4)`,
      [
        buyerId,
        cashbackAmount,
        jobId,
        JSON.stringify({ purchase_amount: purchaseAmount, rate }),
      ],
    );

    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [cashbackAmount, buyerId],
    );
  });

  // Notify buyer about cashback
  notifySafe(buyerId, {
    type: 'reward',
    amount: cashbackAmount,
    reason: '구매 캐시백',
  });
}

// --- Review Reward ---

export async function processReviewReward(
  userId: string,
  jobId: string,
): Promise<void> {
  const cfg = await getConfig();
  const rewardAmount = cfg.review_reward ?? 0;
  if (rewardAmount <= 0) return;

  // Check if reward already given for this job
  const existing = await query(
    `SELECT id FROM reward_history
     WHERE user_id = $1 AND source_job_id = $2 AND type = 'review_reward'`,
    [userId, jobId],
  );
  if (existing.rows.length > 0) return; // Already rewarded

  await transaction(async (client: PoolClient) => {
    await client.query(
      `INSERT INTO reward_history
         (user_id, type, amount, source_job_id, metadata)
       VALUES ($1, 'review_reward', $2, $3, $4)`,
      [userId, rewardAmount, jobId, JSON.stringify({})],
    );

    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [rewardAmount, userId],
    );
  });
}

// --- Signup & API Key Bonus ---

export async function processSignupBonus(userId: string): Promise<number> {
  const cfg = await getConfig();
  const amount = cfg.signup_free_credit ?? 0;
  if (amount <= 0) return 0;

  // 중복 지급 방지
  const existing = await query(
    `SELECT id FROM reward_history WHERE user_id = $1 AND type = 'signup_bonus'`,
    [userId],
  );
  if (existing.rows.length > 0) return 0;

  await transaction(async (client: PoolClient) => {
    await client.query(
      `INSERT INTO reward_history (user_id, type, amount, metadata)
       VALUES ($1, 'signup_bonus', $2, $3)`,
      [userId, amount, JSON.stringify({ description: '신규 가입 무료 체험 크레딧' })],
    );
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [amount, userId],
    );
  });

  return amount;
}

export async function processApiKeyBonus(userId: string): Promise<number> {
  const cfg = await getConfig();
  const amount = cfg.api_key_free_credit ?? 0;
  if (amount <= 0) return 0;

  // 이미 지급된 경우 스킵
  const existing = await query(
    `SELECT id FROM reward_history WHERE user_id = $1 AND type = 'api_key_bonus'`,
    [userId],
  );
  if (existing.rows.length > 0) return 0;

  await transaction(async (client: PoolClient) => {
    await client.query(
      `INSERT INTO reward_history (user_id, type, amount, metadata)
       VALUES ($1, 'api_key_bonus', $2, $3)`,
      [userId, amount, JSON.stringify({ description: 'API 키 첫 발급 무료 크레딧' })],
    );
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [amount, userId],
    );
  });

  return amount;
}

// --- History & Stats ---

export async function getRewardHistory(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<{ rewards: RewardHistory[]; total: number }> {
  const [dataResult, countResult] = await Promise.all([
    query<RewardHistory>(
      `SELECT * FROM reward_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, Math.min(limit, 100), offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM reward_history WHERE user_id = $1',
      [userId],
    ),
  ]);

  return {
    rewards: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function getRewardStats(userId: string): Promise<RewardStats> {
  const [totalResult, byTypeResult] = await Promise.all([
    query<{ total: string }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM reward_history WHERE user_id = $1',
      [userId],
    ),
    query<{ type: string; total: string; count: string }>(
      `SELECT type, SUM(amount) as total, COUNT(*) as count
       FROM reward_history
       WHERE user_id = $1
       GROUP BY type
       ORDER BY total DESC`,
      [userId],
    ),
  ]);

  return {
    totalEarned: parseFloat(totalResult.rows[0].total),
    byType: byTypeResult.rows.map((r) => ({
      type: r.type,
      total: parseFloat(r.total),
      count: parseInt(r.count, 10),
    })),
  };
}
