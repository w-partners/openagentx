import { query, transaction } from '../pool';

export interface TopupRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  admin_note: string | null;
  approved_by: string | null;
  created_at: Date;
  approved_at: Date | null;
}

export interface TopupRequestWithUser extends TopupRequest {
  nickname: string;
  email: string | null;
}

/** Create a new pending top-up request */
export async function createRequest(userId: string, amount: number): Promise<TopupRequest> {
  if (amount < 1 || amount > 1000) {
    throw new Error('충전 금액은 $1 ~ $1,000 범위여야 합니다');
  }
  const result = await query<TopupRequest>(
    'INSERT INTO topup_requests (user_id, amount) VALUES ($1, $2) RETURNING *',
    [userId, amount],
  );
  return result.rows[0];
}

/** List all pending requests (for admin) */
export async function findPending(): Promise<TopupRequestWithUser[]> {
  const result = await query<TopupRequestWithUser>(
    `SELECT t.*, u.nickname, u.email
     FROM topup_requests t
     JOIN users u ON u.id = t.user_id
     WHERE t.status = 'pending'
     ORDER BY t.created_at ASC`,
  );
  return result.rows;
}

/** List all requests (for admin, including approved/rejected) */
export async function findAll(limit = 50): Promise<TopupRequestWithUser[]> {
  const result = await query<TopupRequestWithUser>(
    `SELECT t.*, u.nickname, u.email
     FROM topup_requests t
     JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/** List a user's own requests */
export async function findByUser(userId: string): Promise<TopupRequest[]> {
  const result = await query<TopupRequest>(
    'SELECT * FROM topup_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId],
  );
  return result.rows;
}

/** Approve a pending request — update status + increase user balance in a transaction */
export async function approve(requestId: string, adminId: string): Promise<void> {
  await transaction(async (client) => {
    // Lock the request row
    const req = await client.query<TopupRequest>(
      `SELECT * FROM topup_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [requestId],
    );
    if (req.rows.length === 0) {
      throw new Error('해당 충전 요청을 찾을 수 없거나 이미 처리되었습니다');
    }
    const { user_id, amount } = req.rows[0];

    // Update request status
    await client.query(
      `UPDATE topup_requests SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2`,
      [adminId, requestId],
    );

    // Increase user balance
    await client.query(
      'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
      [amount, user_id],
    );
  });
}

/** Reject a pending request */
export async function reject(requestId: string, adminId: string, reason?: string): Promise<void> {
  const result = await query(
    `UPDATE topup_requests
     SET status = 'rejected', approved_by = $1, admin_note = $2, approved_at = NOW()
     WHERE id = $3 AND status = 'pending'`,
    [adminId, reason ?? null, requestId],
  );
  if (result.rowCount === 0) {
    throw new Error('해당 충전 요청을 찾을 수 없거나 이미 처리되었습니다');
  }
}
