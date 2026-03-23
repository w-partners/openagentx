import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';
import { notifySafe, notifyProvidersSafe } from '../../telegram/notifications';

// --- Types ---

export type AuctionStatus = 'open' | 'awarded' | 'expired' | 'cancelled';
export type BidStatus = 'pending' | 'selected' | 'rejected' | 'refunded';

export interface AuctionRequest {
  id: string;
  requester_id: string | null;
  requester_ip: string | null;
  title: string;
  description: string;
  category: string;
  budget_max: number | null;
  status: AuctionStatus;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  provider_id: string;
  agent_id: string;
  bid_fee: number;
  offer_price: number;
  offer_description: string;
  estimated_time: string | null;
  rank: number | null;
  status: BidStatus;
  selected_at: Date | null;
  created_at: Date;
  // Joined fields
  agent_name?: string;
  agent_slug?: string;
  provider_name?: string;
}

export interface AuctionWithBids extends AuctionRequest {
  bids: AuctionBid[];
  bid_count: number;
}

// --- Repository ---

const DEFAULT_EXPIRY_HOURS = 24;

export async function createAuction(input: {
  requester_id?: string;
  requester_ip?: string;
  title: string;
  description: string;
  category: string;
  budget_max?: number;
  expires_in_hours?: number;
}): Promise<string> {
  const expiryHours = input.expires_in_hours ?? DEFAULT_EXPIRY_HOURS;
  const result = await query<{ id: string }>(
    `INSERT INTO auction_requests (requester_id, requester_ip, title, description, category, budget_max, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(hours => $7))
     RETURNING id`,
    [
      input.requester_id ?? null,
      input.requester_ip ?? null,
      input.title,
      input.description,
      input.category,
      input.budget_max ?? null,
      expiryHours,
    ],
  );

  // Notify online providers in category
  notifyProvidersSafe(input.category, {
    type: 'auction_new',
    title: input.title,
    category: input.category,
    budget: input.budget_max ?? 0,
    auctionId: result.rows[0].id,
  });

  return result.rows[0].id;
}

export async function findOpen(filters?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ auctions: (AuctionRequest & { bid_count: number })[]; total: number }> {
  const conditions = ["ar.status = 'open'", 'ar.expires_at > NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  if (filters?.category) {
    conditions.push(`ar.category = $${idx++}`);
    values.push(filters.category);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<AuctionRequest & { bid_count: number }>(
      `SELECT ar.*, COALESCE(bc.cnt, 0)::int AS bid_count
       FROM auction_requests ar
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM auction_bids GROUP BY auction_id) bc
         ON bc.auction_id = ar.id
       ${where}
       ORDER BY ar.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM auction_requests ar ${where}`,
      values,
    ),
  ]);

  return {
    auctions: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findById(id: string): Promise<AuctionWithBids | null> {
  const auctionResult = await query<AuctionRequest>(
    'SELECT * FROM auction_requests WHERE id = $1',
    [id],
  );
  if (auctionResult.rows.length === 0) return null;

  const bidsResult = await query<AuctionBid>(
    `SELECT ab.*, a.name AS agent_name, a.slug AS agent_slug, u.name AS provider_name
     FROM auction_bids ab
     JOIN agents a ON a.id = ab.agent_id
     JOIN users u ON u.id = ab.provider_id
     WHERE ab.auction_id = $1
     ORDER BY ab.bid_fee DESC, ab.created_at ASC`,
    [id],
  );

  return {
    ...auctionResult.rows[0],
    bids: bidsResult.rows,
    bid_count: bidsResult.rows.length,
  };
}

export async function placeBid(input: {
  auction_id: string;
  provider_id: string;
  agent_id: string;
  bid_fee: number;
  offer_price: number;
  offer_description: string;
  estimated_time?: string;
}): Promise<string> {
  return await transaction(async (client: PoolClient) => {
    // Verify auction is open
    const auctionResult = await client.query(
      "SELECT id, status, expires_at FROM auction_requests WHERE id = $1 AND status = 'open' AND expires_at > NOW()",
      [input.auction_id],
    );
    if (auctionResult.rowCount === 0) {
      throw new Error('경매를 찾을 수 없거나 이미 마감되었습니다');
    }

    // Check duplicate bid from same provider+agent
    const existing = await client.query(
      'SELECT id FROM auction_bids WHERE auction_id = $1 AND provider_id = $2 AND agent_id = $3',
      [input.auction_id, input.provider_id, input.agent_id],
    );
    if (existing.rowCount !== null && existing.rowCount > 0) {
      throw new Error('이미 이 에이전트로 입찰했습니다');
    }

    // Deduct bid_fee from provider balance
    if (input.bid_fee > 0) {
      const deductResult = await client.query(
        'UPDATE users SET balance_usdc = balance_usdc - $1 WHERE id = $2 AND balance_usdc >= $1 RETURNING id',
        [input.bid_fee, input.provider_id],
      );
      if (deductResult.rowCount === 0) {
        throw new Error('잔액이 부족합니다');
      }

      // Record payment
      await client.query(
        `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
         VALUES ($1, 'job_payment', $2, 'USDC', 'completed', $3)`,
        [
          input.provider_id,
          input.bid_fee,
          JSON.stringify({ type: 'auction_bid_fee', auction_id: input.auction_id }),
        ],
      );
    }

    // Insert bid
    const bidResult = await client.query<{ id: string }>(
      `INSERT INTO auction_bids (auction_id, provider_id, agent_id, bid_fee, offer_price, offer_description, estimated_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.auction_id,
        input.provider_id,
        input.agent_id,
        input.bid_fee,
        input.offer_price,
        input.offer_description,
        input.estimated_time ?? null,
      ],
    );

    // Re-rank all bids for this auction
    await client.query(
      `UPDATE auction_bids SET rank = sub.rn
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY bid_fee DESC, created_at ASC) AS rn
         FROM auction_bids WHERE auction_id = $1
       ) sub
       WHERE auction_bids.id = sub.id`,
      [input.auction_id],
    );

    // Notify auction owner about new bid
    const auctionOwner = await client.query<{ requester_id: string | null }>(
      'SELECT requester_id FROM auction_requests WHERE id = $1',
      [input.auction_id],
    );
    if (auctionOwner.rows[0]?.requester_id) {
      const providerNameResult = await client.query<{ name: string }>(
        'SELECT name FROM users WHERE id = $1',
        [input.provider_id],
      );
      notifySafe(auctionOwner.rows[0].requester_id, {
        type: 'auction_bid',
        bidderName: providerNameResult.rows[0]?.name ?? '입찰자',
        offerPrice: input.offer_price,
        auctionId: input.auction_id,
      });
    }

    return bidResult.rows[0].id;
  });
}

export async function selectBid(
  auctionId: string,
  bidId: string,
  requesterId: string,
): Promise<string> {
  return await transaction(async (client: PoolClient) => {
    // Verify ownership
    const auctionResult = await client.query(
      "SELECT * FROM auction_requests WHERE id = $1 AND requester_id = $2 AND status = 'open'",
      [auctionId, requesterId],
    );
    if (auctionResult.rowCount === 0) {
      throw new Error('경매를 찾을 수 없거나 권한이 없습니다');
    }

    const auction = auctionResult.rows[0];

    // Get the bid
    const bidResult = await client.query(
      "SELECT * FROM auction_bids WHERE id = $1 AND auction_id = $2 AND status = 'pending'",
      [bidId, auctionId],
    );
    if (bidResult.rowCount === 0) {
      throw new Error('입찰을 찾을 수 없습니다');
    }

    const bid = bidResult.rows[0];

    // Create marketplace_job
    const jobResult = await client.query<{ id: string }>(
      `INSERT INTO marketplace_jobs (agent_id, buyer_id, payment_amount, status, commission_rate)
       SELECT $1, $2, $3, 'pending',
              COALESCE((SELECT commission_rate FROM agents WHERE id = $1), 0)
       RETURNING id`,
      [bid.agent_id, requesterId, bid.offer_price],
    );
    const jobId = jobResult.rows[0].id;

    // Mark bid as selected
    await client.query(
      "UPDATE auction_bids SET status = 'selected', selected_at = NOW() WHERE id = $1",
      [bidId],
    );

    // Reject other bids
    await client.query(
      "UPDATE auction_bids SET status = 'rejected' WHERE auction_id = $1 AND id != $2 AND status = 'pending'",
      [auctionId, bidId],
    );

    // Update auction status
    await client.query(
      "UPDATE auction_requests SET status = 'awarded', updated_at = NOW() WHERE id = $1",
      [auctionId],
    );

    // Notify winning bidder
    notifySafe(bid.provider_id, {
      type: 'auction_selected',
      auctionId,
      auctionTitle: auction.title,
    });

    return jobId;
  });
}

export async function cancelAuction(auctionId: string, requesterId: string): Promise<void> {
  const result = await query(
    `UPDATE auction_requests SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND requester_id = $2 AND status = 'open'`,
    [auctionId, requesterId],
  );
  if (result.rowCount === 0) {
    throw new Error('경매를 찾을 수 없거나 취소할 수 없는 상태입니다');
  }
}

export async function getMyAuctions(
  userId: string,
  filters?: { limit?: number; offset?: number },
): Promise<{ auctions: (AuctionRequest & { bid_count: number })[]; total: number }> {
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<AuctionRequest & { bid_count: number }>(
      `SELECT ar.*, COALESCE(bc.cnt, 0)::int AS bid_count
       FROM auction_requests ar
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM auction_bids GROUP BY auction_id) bc
         ON bc.auction_id = ar.id
       WHERE ar.requester_id = $1
       ORDER BY ar.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM auction_requests WHERE requester_id = $1',
      [userId],
    ),
  ]);

  return {
    auctions: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function getMyBids(
  userId: string,
  filters?: { limit?: number; offset?: number },
): Promise<{ bids: (AuctionBid & { auction_title: string; auction_status: string })[]; total: number }> {
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<AuctionBid & { auction_title: string; auction_status: string }>(
      `SELECT ab.*, ar.title AS auction_title, ar.status AS auction_status,
              a.name AS agent_name, a.slug AS agent_slug
       FROM auction_bids ab
       JOIN auction_requests ar ON ar.id = ab.auction_id
       JOIN agents a ON a.id = ab.agent_id
       WHERE ab.provider_id = $1
       ORDER BY ab.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM auction_bids WHERE provider_id = $1',
      [userId],
    ),
  ]);

  return {
    bids: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/** Find expired auctions and update their status. Returns count of expired. */
export async function expireAuctions(): Promise<number> {
  const result = await query(
    "UPDATE auction_requests SET status = 'expired', updated_at = NOW() WHERE status = 'open' AND expires_at < NOW()",
  );
  return result.rowCount ?? 0;
}

/** Refund bid fees for an expired auction */
export async function refundBidsForAuction(auctionId: string): Promise<number> {
  return await transaction(async (client: PoolClient) => {
    const bidsResult = await client.query<{ id: string; provider_id: string; bid_fee: number }>(
      "SELECT id, provider_id, bid_fee FROM auction_bids WHERE auction_id = $1 AND status = 'pending' AND bid_fee > 0",
      [auctionId],
    );

    for (const bid of bidsResult.rows) {
      await client.query(
        'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2',
        [bid.bid_fee, bid.provider_id],
      );
      await client.query(
        `INSERT INTO payments (user_id, payment_type, amount, currency, status, metadata)
         VALUES ($1, 'refund', $2, 'USDC', 'completed', $3)`,
        [
          bid.provider_id,
          bid.bid_fee,
          JSON.stringify({ type: 'auction_bid_refund', auction_id: auctionId, bid_id: bid.id }),
        ],
      );
      await client.query(
        "UPDATE auction_bids SET status = 'refunded' WHERE id = $1",
        [bid.id],
      );
    }

    return bidsResult.rows.length;
  });
}
