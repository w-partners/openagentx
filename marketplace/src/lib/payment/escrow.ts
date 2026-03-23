import { transaction } from '../db/pool';
import type { PoolClient } from 'pg';

/**
 * DB-based USDC escrow system.
 * Flow: buyer balance → escrow → (on completion) provider balance minus commission
 */

export async function lockEscrow(jobId: string, buyerId: string, amount: number): Promise<void> {
  await transaction(async (client: PoolClient) => {
    // Deduct from buyer balance
    const buyerResult = await client.query(
      'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING id',
      [amount, buyerId],
    );
    if (buyerResult.rowCount === 0) {
      throw new Error('잔액이 부족합니다');
    }

    // Lock in escrow
    await client.query(
      'UPDATE marketplace_jobs SET escrow_balance = $1 WHERE id = $2',
      [amount, jobId],
    );

    // Record payment
    await client.query(
      `INSERT INTO payments (job_id, user_id, payment_type, amount, currency, status)
       VALUES ($1, $2, 'job_payment', $3, 'USDC', 'escrowed')`,
      [jobId, buyerId, amount],
    );
  });
}

export async function releaseEscrow(jobId: string): Promise<void> {
  await transaction(async (client: PoolClient) => {
    // Get job details
    const jobResult = await client.query(
      `SELECT agent_id, buyer_id, escrow_balance, commission_rate, payment_amount
       FROM marketplace_jobs WHERE id = $1 AND escrow_balance > 0`,
      [jobId],
    );
    if (jobResult.rowCount === 0) {
      throw new Error('에스크로 잔액이 없습니다');
    }

    const job = jobResult.rows[0];
    const commissionAmount = job.payment_amount * job.commission_rate / 100;
    const providerAmount = job.payment_amount - commissionAmount;

    // Get agent owner
    const agentResult = await client.query(
      'SELECT owner_id FROM agents WHERE id = $1',
      [job.agent_id],
    );
    const providerId = agentResult.rows[0].owner_id;

    // Transfer to provider
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [providerAmount, providerId],
    );

    // Update job
    await client.query(
      `UPDATE marketplace_jobs SET
         escrow_balance = 0,
         commission_amount = $1,
         provider_amount = $2,
         status = 'completed',
         completed_at = NOW()
       WHERE id = $3`,
      [commissionAmount, providerAmount, jobId],
    );

    // Record settlement payment
    await client.query(
      `INSERT INTO payments (job_id, user_id, payment_type, amount, currency, status)
       VALUES ($1, $2, 'settlement', $3, 'USDC', 'completed')`,
      [jobId, providerId, providerAmount],
    );

    // Update agent stats
    await client.query(
      `UPDATE agents SET
         total_jobs = total_jobs + 1,
         total_revenue = total_revenue + $1
       WHERE id = $2`,
      [providerAmount, job.agent_id],
    );
  });
}

export async function refundEscrow(jobId: string): Promise<void> {
  await transaction(async (client: PoolClient) => {
    const jobResult = await client.query(
      'SELECT buyer_id, escrow_balance FROM marketplace_jobs WHERE id = $1 AND escrow_balance > 0',
      [jobId],
    );
    if (jobResult.rowCount === 0) {
      throw new Error('환불할 에스크로 잔액이 없습니다');
    }

    const { buyer_id, escrow_balance } = jobResult.rows[0];

    // Return to buyer
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [escrow_balance, buyer_id],
    );

    // Update job
    await client.query(
      `UPDATE marketplace_jobs SET escrow_balance = 0, status = 'refunded' WHERE id = $1`,
      [jobId],
    );

    // Record refund
    await client.query(
      `INSERT INTO payments (job_id, user_id, payment_type, amount, currency, status)
       VALUES ($1, $2, 'refund', $3, 'USDC', 'completed')`,
      [jobId, buyer_id, escrow_balance],
    );
  });
}
