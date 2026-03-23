import { NextRequest } from 'next/server';
import * as auctionsRepo from '@/lib/db/repositories/auctions';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';

const createAuctionSchema = z.object({
  action: z.literal('create'),
  title: z.string().min(5, '제목은 5자 이상이어야 합니다').max(200),
  description: z.string().min(10, '설명은 10자 이상이어야 합니다').max(5000),
  category: z.string().min(1),
  budget_max: z.number().positive().optional(),
  expires_in_hours: z.number().min(1).max(168).optional(), // max 7 days
});

const placeBidSchema = z.object({
  action: z.literal('bid'),
  auction_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  bid_fee: z.number().min(0),
  offer_price: z.number().positive('제안 가격은 0보다 커야 합니다'),
  offer_description: z.string().min(10, '설명은 10자 이상이어야 합니다').max(5000),
  estimated_time: z.string().max(50).optional(),
});

const selectBidSchema = z.object({
  action: z.literal('select'),
  auction_id: z.string().uuid(),
  bid_id: z.string().uuid(),
});

const cancelSchema = z.object({
  action: z.literal('cancel'),
  auction_id: z.string().uuid(),
});

// POST /api/auctions
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();
    const action = body?.action;

    if (action === 'create') {
      const parsed = createAuctionSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      const id = await auctionsRepo.createAuction({
        requester_id: userId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        budget_max: parsed.data.budget_max,
        expires_in_hours: parsed.data.expires_in_hours,
      });
      return apiJson({ data: { id } }, 201);
    }

    if (action === 'bid') {
      const parsed = placeBidSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      const bidId = await auctionsRepo.placeBid({
        auction_id: parsed.data.auction_id,
        provider_id: userId,
        agent_id: parsed.data.agent_id,
        bid_fee: parsed.data.bid_fee,
        offer_price: parsed.data.offer_price,
        offer_description: parsed.data.offer_description,
        estimated_time: parsed.data.estimated_time,
      });
      return apiJson({ data: { id: bidId } }, 201);
    }

    if (action === 'select') {
      const parsed = selectBidSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      const jobId = await auctionsRepo.selectBid(
        parsed.data.auction_id,
        parsed.data.bid_id,
        userId,
      );
      return apiJson({ data: { job_id: jobId } });
    }

    if (action === 'cancel') {
      const parsed = cancelSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      await auctionsRepo.cancelAuction(parsed.data.auction_id, userId);
      return apiJson({ data: { cancelled: true } });
    }

    return apiJson({ error: '지원하지 않는 action입니다' }, 400);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}

// GET /api/auctions
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  try {
    const my = searchParams.get('my');

    if (my === 'requests' || my === 'bids') {
      const userId = requireAuth(request);
      const { limit, offset } = parsePagination(searchParams);

      if (my === 'requests') {
        const result = await auctionsRepo.getMyAuctions(userId, { limit, offset });
        return apiJson({ data: result.auctions, meta: { total: result.total, limit, offset } });
      }
      const result = await auctionsRepo.getMyBids(userId, { limit, offset });
      return apiJson({ data: result.bids, meta: { total: result.total, limit, offset } });
    }

    // Get single auction by id
    const id = searchParams.get('id');
    if (id) {
      const auction = await auctionsRepo.findById(id);
      if (!auction) return apiJson({ error: '경매를 찾을 수 없습니다' }, 404);
      return apiJson({ data: auction });
    }

    // List open auctions
    const category = searchParams.get('category') ?? undefined;
    const { limit, offset } = parsePagination(searchParams);
    const result = await auctionsRepo.findOpen({ category, limit, offset });
    return apiJson({ data: result.auctions, meta: { total: result.total, limit, offset } });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}
