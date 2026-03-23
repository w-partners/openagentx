import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';

export type PaymentType = 'deposit' | 'withdrawal' | 'job_payment' | 'settlement' | 'refund';
export type PaymentStatus = 'pending' | 'completed' | 'escrowed' | 'failed' | 'cancelled';

export interface Payment {
  id: string;
  job_id: string | null;
  user_id: string;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  tx_hash: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export async function createPayment(input: {
  job_id?: string;
  user_id: string;
  payment_type: PaymentType;
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  tx_hash?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO payments (job_id, user_id, payment_type, amount, currency, status, tx_hash, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      input.job_id ?? null,
      input.user_id,
      input.payment_type,
      input.amount,
      input.currency ?? 'USDC',
      input.status ?? 'pending',
      input.tx_hash ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
  return result.rows[0].id;
}

export async function findByUser(
  userId: string,
  filters?: { type?: PaymentType; limit?: number; offset?: number },
): Promise<{ payments: Payment[]; total: number }> {
  const conditions = ['user_id = $1'];
  const values: unknown[] = [userId];
  let idx = 2;

  if (filters?.type) {
    conditions.push(`payment_type = $${idx++}`);
    values.push(filters.type);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters?.limit ?? 20, 100);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<Payment>(
      `SELECT * FROM payments ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM payments ${where}`,
      values,
    ),
  ]);

  return {
    payments: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findByJob(jobId: string): Promise<Payment[]> {
  const result = await query<Payment>(
    'SELECT * FROM payments WHERE job_id = $1 ORDER BY created_at DESC',
    [jobId],
  );
  return result.rows;
}

export async function deposit(userId: string, amount: number, txHash?: string): Promise<string> {
  let paymentId = '';
  await transaction(async (client: PoolClient) => {
    // Credit user balance
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [amount, userId],
    );

    // Record payment
    const result = await client.query<{ id: string }>(
      `INSERT INTO payments (user_id, payment_type, amount, currency, status, tx_hash)
       VALUES ($1, 'deposit', $2, 'USDC', 'completed', $3)
       RETURNING id`,
      [userId, amount, txHash ?? null],
    );
    paymentId = result.rows[0].id;
  });
  return paymentId;
}

export async function withdraw(userId: string, amount: number): Promise<string> {
  let paymentId = '';
  await transaction(async (client: PoolClient) => {
    // Deduct from user balance
    const result = await client.query(
      'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING id',
      [amount, userId],
    );
    if (result.rowCount === 0) {
      throw new Error('잔액이 부족합니다');
    }

    // Record payment as pending (actual withdrawal processed externally)
    const payResult = await client.query<{ id: string }>(
      `INSERT INTO payments (user_id, payment_type, amount, currency, status)
       VALUES ($1, 'withdrawal', $2, 'USDC', 'pending')
       RETURNING id`,
      [userId, amount],
    );
    paymentId = payResult.rows[0].id;
  });
  return paymentId;
}

export async function getBalance(userId: string): Promise<{
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalSpent: number;
  totalEarned: number;
}> {
  const [balanceResult, statsResult] = await Promise.all([
    query<{ balance_usdc: string }>('SELECT balance_usdc FROM users WHERE id = $1', [userId]),
    query<{
      total_deposited: string;
      total_withdrawn: string;
      total_spent: string;
      total_earned: string;
    }>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE payment_type = 'deposit' AND status = 'completed'), 0) as total_deposited,
         COALESCE(SUM(amount) FILTER (WHERE payment_type = 'withdrawal' AND status != 'failed'), 0) as total_withdrawn,
         COALESCE(SUM(amount) FILTER (WHERE payment_type = 'job_payment' AND status IN ('completed', 'escrowed')), 0) as total_spent,
         COALESCE(SUM(amount) FILTER (WHERE payment_type = 'settlement' AND status = 'completed'), 0) as total_earned
       FROM payments
       WHERE user_id = $1`,
      [userId],
    ),
  ]);

  if (balanceResult.rows.length === 0) throw new Error('사용자를 찾을 수 없습니다');

  const stats = statsResult.rows[0];
  return {
    balance: parseFloat(balanceResult.rows[0].balance_usdc),
    totalDeposited: parseFloat(stats.total_deposited),
    totalWithdrawn: parseFloat(stats.total_withdrawn),
    totalSpent: parseFloat(stats.total_spent),
    totalEarned: parseFloat(stats.total_earned),
  };
}

export async function getHistory(
  userId: string,
  filters?: { limit?: number; offset?: number },
): Promise<{ payments: Payment[]; total: number }> {
  return findByUser(userId, filters);
}
