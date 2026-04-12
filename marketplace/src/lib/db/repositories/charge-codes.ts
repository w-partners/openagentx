import { query, transaction } from '../pool';

export interface ChargeCode {
  id: string;
  code: string;
  points: number;
  status: string;
  used_by: string | null;
  used_at: Date | null;
  created_at: Date;
}

let _tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (_tableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS charge_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      points INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      used_by UUID REFERENCES users(id),
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_charge_codes_code ON charge_codes(code)');
  await query('CREATE INDEX IF NOT EXISTS idx_charge_codes_status ON charge_codes(status)');
  _tableEnsured = true;
}

/**
 * Redeem a charge code: mark as used, increase user balance, return points.
 */
export async function redeemCode(code: string, userId: string): Promise<{ points: number }> {
  await ensureTable();

  return transaction(async (client) => {
    // Lock the code row
    const codeResult = await client.query<ChargeCode>(
      `SELECT * FROM charge_codes WHERE code = $1 AND status = 'active' FOR UPDATE`,
      [code],
    );
    if (codeResult.rows.length === 0) {
      throw new Error('유효하지 않거나 이미 사용된 충전 코드입니다');
    }

    const { id, points } = codeResult.rows[0];

    // Mark code as used
    await client.query(
      `UPDATE charge_codes SET status = 'used', used_by = $1, used_at = NOW() WHERE id = $2`,
      [userId, id],
    );

    // Increase user balance
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [points, userId],
    );

    return { points };
  });
}
