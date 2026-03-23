import { query, transaction } from '../pool';
import { notifySafe } from '../../telegram/notifications';

// --- Constants ---
export const REFERRAL_REWARD_REFERRER = 1.0;
export const REFERRAL_REWARD_REFERRED = 1.0;
export const SNS_SHARE_REWARD = 1.0;
export const MAX_SHARE_REWARDS_PER_USER = 5;

// --- Interfaces ---
export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  total_referrals: number;
  total_earned: number;
  created_at: Date;
}

export interface ReferralHistory {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  referrer_reward: number;
  referred_reward: number;
  created_at: Date;
}

export interface ShareReward {
  id: string;
  user_id: string;
  platform: string;
  share_url: string;
  status: string;
  reward_amount: number;
  verified_by: string | null;
  created_at: Date;
  verified_at: Date | null;
}

export interface ShareRewardWithUser extends ShareReward {
  nickname: string;
  email: string | null;
}

// --- Helper: generate OAX-XXXXXXXX code ---
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OAX-${result}`;
}

// --- Referral Code ---

export async function generateCode(userId: string): Promise<ReferralCode> {
  // Check if already exists
  const existing = await query<ReferralCode>(
    'SELECT * FROM referral_codes WHERE user_id = $1',
    [userId],
  );
  if (existing.rows.length > 0) return existing.rows[0];

  // Try up to 5 times in case of collision
  for (let i = 0; i < 5; i++) {
    const code = generateUniqueCode();
    try {
      const result = await query<ReferralCode>(
        'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) RETURNING *',
        [userId, code],
      );
      return result.rows[0];
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505' && i < 4) continue; // unique violation, retry
      throw err;
    }
  }
  throw new Error('추천 코드 생성에 실패했습니다');
}

export async function getCode(userId: string): Promise<ReferralCode | null> {
  const result = await query<ReferralCode>(
    'SELECT * FROM referral_codes WHERE user_id = $1',
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function findByCode(code: string): Promise<ReferralCode | null> {
  const result = await query<ReferralCode>(
    'SELECT * FROM referral_codes WHERE code = $1',
    [code],
  );
  return result.rows[0] ?? null;
}

// --- Apply Referral ---

export async function applyReferral(
  newUserId: string,
  code: string,
): Promise<void> {
  const referralCode = await findByCode(code);
  if (!referralCode) throw new Error('유효하지 않은 추천 코드입니다');
  if (referralCode.user_id === newUserId) return; // Cannot refer yourself

  // Check if already referred
  const existing = await query(
    'SELECT id FROM referral_history WHERE referred_id = $1',
    [newUserId],
  );
  if (existing.rows.length > 0) return; // Already used a referral

  await transaction(async (client) => {
    // Record history
    await client.query(
      `INSERT INTO referral_history (referrer_id, referred_id, referral_code, referrer_reward, referred_reward)
       VALUES ($1, $2, $3, $4, $5)`,
      [referralCode.user_id, newUserId, code, REFERRAL_REWARD_REFERRER, REFERRAL_REWARD_REFERRED],
    );

    // Credit referrer
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [REFERRAL_REWARD_REFERRER, referralCode.user_id],
    );

    // Credit new user
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [REFERRAL_REWARD_REFERRED, newUserId],
    );

    // Update referral code stats
    await client.query(
      `UPDATE referral_codes
       SET total_referrals = total_referrals + 1,
           total_earned = total_earned + $1
       WHERE id = $2`,
      [REFERRAL_REWARD_REFERRER, referralCode.id],
    );

    // Get referred user name for notification
    const referredUser = await client.query<{ name: string }>(
      'SELECT name FROM users WHERE id = $1',
      [newUserId],
    );
    notifySafe(referralCode.user_id, {
      type: 'referral_signup',
      referredName: referredUser.rows[0]?.name ?? '새 사용자',
    });
  });
}

// --- Stats ---

export async function getStats(userId: string): Promise<{
  code: string | null;
  totalReferrals: number;
  totalEarned: number;
  history: ReferralHistory[];
}> {
  const codeResult = await getCode(userId);
  const historyResult = await query<ReferralHistory>(
    'SELECT * FROM referral_history WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId],
  );

  return {
    code: codeResult?.code ?? null,
    totalReferrals: codeResult?.total_referrals ?? 0,
    totalEarned: parseFloat(String(codeResult?.total_earned ?? 0)),
    history: historyResult.rows,
  };
}

// --- SNS Share Rewards ---

export async function submitShare(
  userId: string,
  platform: string,
  shareUrl: string,
): Promise<ShareReward> {
  // Check max share rewards
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM share_rewards
     WHERE user_id = $1 AND status = 'approved'`,
    [userId],
  );
  const approvedCount = parseInt(countResult.rows[0].count, 10);
  if (approvedCount >= MAX_SHARE_REWARDS_PER_USER) {
    throw new Error(`SNS 공유 보상은 최대 ${MAX_SHARE_REWARDS_PER_USER}회까지 받을 수 있습니다`);
  }

  // Check duplicate URL
  const dupResult = await query(
    'SELECT id FROM share_rewards WHERE user_id = $1 AND share_url = $2',
    [userId, shareUrl],
  );
  if (dupResult.rows.length > 0) {
    throw new Error('이미 제출한 URL입니다');
  }

  const result = await query<ShareReward>(
    `INSERT INTO share_rewards (user_id, platform, share_url, reward_amount)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, platform, shareUrl, SNS_SHARE_REWARD],
  );
  return result.rows[0];
}

export async function getPendingShares(): Promise<ShareRewardWithUser[]> {
  const result = await query<ShareRewardWithUser>(
    `SELECT s.*, u.nickname, u.email
     FROM share_rewards s
     JOIN users u ON u.id = s.user_id
     WHERE s.status = 'pending'
     ORDER BY s.created_at ASC`,
  );
  return result.rows;
}

export async function approveShare(
  shareId: string,
  adminId: string,
): Promise<void> {
  await transaction(async (client) => {
    const req = await client.query<ShareReward>(
      `SELECT * FROM share_rewards WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [shareId],
    );
    if (req.rows.length === 0) {
      throw new Error('해당 공유 인증을 찾을 수 없거나 이미 처리되었습니다');
    }

    const { user_id, reward_amount } = req.rows[0];

    // Check max share rewards
    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM share_rewards
       WHERE user_id = $1 AND status = 'approved'`,
      [user_id],
    );
    const approvedCount = parseInt(countResult.rows[0].count, 10);
    if (approvedCount >= MAX_SHARE_REWARDS_PER_USER) {
      throw new Error('이 사용자는 이미 최대 공유 보상 횟수에 도달했습니다');
    }

    // Update status
    await client.query(
      `UPDATE share_rewards
       SET status = 'approved', verified_by = $1, verified_at = NOW()
       WHERE id = $2`,
      [adminId, shareId],
    );

    // Credit user
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [reward_amount, user_id],
    );
  });
}

export async function rejectShare(
  shareId: string,
  adminId: string,
): Promise<void> {
  const result = await query(
    `UPDATE share_rewards
     SET status = 'rejected', verified_by = $1, verified_at = NOW()
     WHERE id = $2 AND status = 'pending'`,
    [adminId, shareId],
  );
  if (result.rowCount === 0) {
    throw new Error('해당 공유 인증을 찾을 수 없거나 이미 처리되었습니다');
  }
}

export async function getShareHistory(userId: string): Promise<ShareReward[]> {
  const result = await query<ShareReward>(
    'SELECT * FROM share_rewards WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId],
  );
  return result.rows;
}
