import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';
import { notifySafe, notifyProvidersSafe } from '../../telegram/notifications';

// --- Types ---

export type MatchingStatus = 'waiting' | 'matched' | 'cancelled' | 'expired';
export type Urgency = 'low' | 'normal' | 'urgent' | 'critical';

export interface MatchingRequest {
  id: string;
  requester_id: string | null;
  requester_contact: Record<string, unknown> | null;
  title: string;
  description: string;
  category: string;
  location: Record<string, unknown> | null;
  urgency: Urgency;
  connection_fee: number;
  status: MatchingStatus;
  matched_provider_id: string | null;
  matched_agent_id: string | null;
  matched_at: Date | null;
  expires_at: Date;
  created_at: Date;
  // Joined fields
  provider_name?: string;
  agent_name?: string;
  agent_slug?: string;
  requester_name?: string;
}

export interface ProviderAvailability {
  id: string;
  user_id: string;
  agent_id: string;
  categories: string[];
  is_online: boolean;
  last_seen_at: Date;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  // Joined
  agent_name?: string;
  agent_slug?: string;
  user_name?: string;
}

// --- Repository ---

export async function createRequest(input: {
  requester_id?: string;
  requester_contact?: Record<string, unknown>;
  title: string;
  description: string;
  category: string;
  location?: Record<string, unknown>;
  urgency?: Urgency;
  connection_fee?: number;
}): Promise<string> {
  // Get expiry minutes from config
  const configResult = await query<{ value: string }>(
    "SELECT value::text FROM reward_config WHERE id = 'matching_expiry_minutes'",
  );
  const expiryMinutes = configResult.rows[0] ? parseFloat(configResult.rows[0].value) : 10;

  // Get default connection fee from config if not provided
  let fee = input.connection_fee;
  if (fee === undefined) {
    const feeResult = await query<{ value: string }>(
      "SELECT value::text FROM reward_config WHERE id = 'default_connection_fee'",
    );
    fee = feeResult.rows[0] ? parseFloat(feeResult.rows[0].value) : 1.0;
  }

  const result = await query<{ id: string }>(
    `INSERT INTO matching_requests
       (requester_id, requester_contact, title, description, category, location, urgency, connection_fee, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + make_interval(mins => $9))
     RETURNING id`,
    [
      input.requester_id ?? null,
      input.requester_contact ? JSON.stringify(input.requester_contact) : null,
      input.title,
      input.description,
      input.category,
      input.location ? JSON.stringify(input.location) : null,
      input.urgency ?? 'normal',
      fee,
      expiryMinutes,
    ],
  );

  // Notify online providers in category
  notifyProvidersSafe(input.category, {
    type: 'matching_request',
    title: input.title,
    category: input.category,
    urgency: input.urgency ?? 'normal',
    requestId: result.rows[0].id,
  });

  return result.rows[0].id;
}

export async function acceptRequest(
  requestId: string,
  providerId: string,
  agentId: string,
): Promise<{ requesterContact: Record<string, unknown> | null; providerInfo: Record<string, unknown> }> {
  return await transaction(async (client: PoolClient) => {
    // Lock the row to prevent race conditions
    const reqResult = await client.query<MatchingRequest>(
      `SELECT * FROM matching_requests WHERE id = $1 AND status = 'waiting' AND expires_at > NOW() FOR UPDATE`,
      [requestId],
    );
    if (reqResult.rowCount === 0) {
      throw new Error('매칭 요청을 찾을 수 없거나 이미 매칭되었습니다');
    }

    const request = reqResult.rows[0];

    // Prevent self-matching
    if (request.requester_id && request.requester_id === providerId) {
      throw new Error('자신의 요청을 수락할 수 없습니다');
    }

    // Verify agent belongs to provider
    const agentResult = await client.query(
      'SELECT id, name, slug FROM agents WHERE id = $1 AND owner_id = $2',
      [agentId, providerId],
    );
    if (agentResult.rowCount === 0) {
      throw new Error('에이전트를 찾을 수 없거나 소유자가 아닙니다');
    }

    const connectionFee = parseFloat(String(request.connection_fee));

    // Deduct connection fee from provider's balance
    if (connectionFee > 0) {
      const deductResult = await client.query(
        'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING id',
        [connectionFee, providerId],
      );
      if (deductResult.rowCount === 0) {
        throw new Error('잔액이 부족합니다');
      }

      // Record payment
      await client.query(
        `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
         VALUES ($1, 'job_payment', $2, 'USDC', 'completed', $3)`,
        [
          providerId,
          connectionFee,
          JSON.stringify({ type: 'connection_fee', matching_request_id: requestId }),
        ],
      );
    }

    // Update request to matched
    await client.query(
      `UPDATE matching_requests
       SET status = 'matched', matched_provider_id = $1, matched_agent_id = $2, matched_at = NOW()
       WHERE id = $3`,
      [providerId, agentId, requestId],
    );

    // Get provider info
    const providerResult = await client.query<{ name: string; email: string }>(
      'SELECT name, email FROM users WHERE id = $1',
      [providerId],
    );
    const agent = agentResult.rows[0];

    // Notify requester that request was accepted
    if (request.requester_id) {
      notifySafe(request.requester_id, {
        type: 'matching_accepted',
        providerName: providerResult.rows[0]?.name ?? '제공자',
        requestId,
        agentName: agent.name,
      });
    }

    return {
      requesterContact: request.requester_contact,
      providerInfo: {
        provider_name: providerResult.rows[0]?.name,
        provider_email: providerResult.rows[0]?.email,
        agent_name: agent.name,
        agent_slug: agent.slug,
      },
    };
  });
}

export async function findWaiting(filters?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ requests: MatchingRequest[]; total: number }> {
  const conditions = ["mr.status = 'waiting'", 'mr.expires_at > NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  if (filters?.category) {
    conditions.push(`mr.category = $${idx++}`);
    values.push(filters.category);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<MatchingRequest>(
      `SELECT mr.*, u.name AS requester_name
       FROM matching_requests mr
       LEFT JOIN users u ON u.id = mr.requester_id
       ${where}
       ORDER BY
         CASE mr.urgency WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         mr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM matching_requests mr ${where}`,
      values,
    ),
  ]);

  return {
    requests: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findById(id: string): Promise<MatchingRequest | null> {
  const result = await query<MatchingRequest>(
    `SELECT mr.*,
            u.name AS requester_name,
            pu.name AS provider_name,
            a.name AS agent_name,
            a.slug AS agent_slug
     FROM matching_requests mr
     LEFT JOIN users u ON u.id = mr.requester_id
     LEFT JOIN users pu ON pu.id = mr.matched_provider_id
     LEFT JOIN agents a ON a.id = mr.matched_agent_id
     WHERE mr.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function cancelRequest(requestId: string, requesterId: string): Promise<void> {
  const result = await query(
    `UPDATE matching_requests SET status = 'cancelled'
     WHERE id = $1 AND requester_id = $2 AND status = 'waiting'`,
    [requestId, requesterId],
  );
  if (result.rowCount === 0) {
    throw new Error('매칭 요청을 찾을 수 없거나 취소할 수 없는 상태입니다');
  }
}

export async function getMyRequests(
  userId: string,
  filters?: { limit?: number; offset?: number },
): Promise<{ requests: MatchingRequest[]; total: number }> {
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<MatchingRequest>(
      `SELECT mr.*, pu.name AS provider_name, a.name AS agent_name, a.slug AS agent_slug
       FROM matching_requests mr
       LEFT JOIN users pu ON pu.id = mr.matched_provider_id
       LEFT JOIN agents a ON a.id = mr.matched_agent_id
       WHERE mr.requester_id = $1
       ORDER BY mr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM matching_requests WHERE requester_id = $1',
      [userId],
    ),
  ]);

  return {
    requests: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function getMyAccepted(
  userId: string,
  filters?: { limit?: number; offset?: number },
): Promise<{ requests: MatchingRequest[]; total: number }> {
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<MatchingRequest>(
      `SELECT mr.*, u.name AS requester_name, a.name AS agent_name, a.slug AS agent_slug
       FROM matching_requests mr
       LEFT JOIN users u ON u.id = mr.requester_id
       LEFT JOIN agents a ON a.id = mr.matched_agent_id
       WHERE mr.matched_provider_id = $1
       ORDER BY mr.matched_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM matching_requests WHERE matched_provider_id = $1',
      [userId],
    ),
  ]);

  return {
    requests: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/** Expire old matching requests */
export async function expireRequests(): Promise<number> {
  const result = await query(
    "UPDATE matching_requests SET status = 'expired' WHERE status = 'waiting' AND expires_at < NOW()",
  );
  return result.rowCount ?? 0;
}

// --- Provider Availability ---

export async function setOnline(
  userId: string,
  agentId: string,
  categories: string[],
  metadata?: Record<string, unknown>,
): Promise<string> {
  // Verify agent belongs to user
  const agentResult = await query(
    'SELECT id FROM agents WHERE id = $1 AND owner_id = $2',
    [agentId, userId],
  );
  if (agentResult.rowCount === 0) {
    throw new Error('에이전트를 찾을 수 없거나 소유자가 아닙니다');
  }

  // Upsert provider availability
  const result = await query<{ id: string }>(
    `INSERT INTO provider_availability (user_id, agent_id, categories, is_online, last_seen_at, metadata)
     VALUES ($1, $2, $3, TRUE, NOW(), $4)
     ON CONFLICT (user_id, agent_id)
     DO UPDATE SET categories = EXCLUDED.categories, is_online = TRUE, last_seen_at = NOW(),
                   metadata = COALESCE(EXCLUDED.metadata, provider_availability.metadata)
     RETURNING id`,
    [userId, agentId, categories, metadata ? JSON.stringify(metadata) : null],
  );

  return result.rows[0].id;
}

export async function setOffline(userId: string): Promise<void> {
  await query(
    'UPDATE provider_availability SET is_online = FALSE WHERE user_id = $1',
    [userId],
  );
}

export async function getOnlineProviders(category?: string): Promise<ProviderAvailability[]> {
  let sql = `SELECT pa.*, a.name AS agent_name, a.slug AS agent_slug, u.name AS user_name
     FROM provider_availability pa
     JOIN agents a ON a.id = pa.agent_id
     JOIN users u ON u.id = pa.user_id
     WHERE pa.is_online = TRUE`;
  const values: unknown[] = [];

  if (category) {
    sql += ` AND $1 = ANY(pa.categories)`;
    values.push(category);
  }

  sql += ' ORDER BY pa.last_seen_at DESC';

  const result = await query<ProviderAvailability>(sql, values);
  return result.rows;
}
