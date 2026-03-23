import { query } from '../pool.js';

export interface WalletTransaction {
  id: string;
  tx_hash: string | null;
  tx_type: string;
  amount_usdc: number | null;
  amount_eth: number | null;
  from_address: string | null;
  to_address: string | null;
  related_job_id: string | null;
  status: string;
  block_number: number | null;
  created_at: Date;
}

export async function createTransaction(tx: {
  tx_hash?: string;
  tx_type: string;
  amount_usdc?: number;
  amount_eth?: number;
  from_address?: string;
  to_address?: string;
  related_job_id?: string;
  status?: string;
  block_number?: number;
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO wallet_transactions (tx_hash, tx_type, amount_usdc, amount_eth, from_address, to_address, related_job_id, status, block_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      tx.tx_hash ?? null,
      tx.tx_type,
      tx.amount_usdc ?? null,
      tx.amount_eth ?? null,
      tx.from_address ?? null,
      tx.to_address ?? null,
      tx.related_job_id ?? null,
      tx.status ?? 'pending',
      tx.block_number ?? null,
    ],
  );
  return result.rows[0].id;
}

export async function updateTransactionStatus(
  id: string,
  status: string,
  blockNumber?: number,
): Promise<void> {
  await query(
    `UPDATE wallet_transactions SET status = $1, block_number = COALESCE($2, block_number) WHERE id = $3`,
    [status, blockNumber ?? null, id],
  );
}

export async function findByType(
  txType: string,
  limit = 20,
  offset = 0,
): Promise<WalletTransaction[]> {
  const result = await query<WalletTransaction>(
    `SELECT * FROM wallet_transactions WHERE tx_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [txType, limit, offset],
  );
  return result.rows;
}

export async function getDailyTxStats(date: string): Promise<{
  total_count: number;
  total_usdc: number;
}> {
  const result = await query<{ total_count: string; total_usdc: string }>(
    `SELECT COUNT(*) as total_count, COALESCE(SUM(amount_usdc), 0) as total_usdc
     FROM wallet_transactions
     WHERE created_at::date = $1 AND status = 'confirmed'`,
    [date],
  );
  const row = result.rows[0];
  return {
    total_count: parseInt(row.total_count, 10),
    total_usdc: parseFloat(row.total_usdc),
  };
}
