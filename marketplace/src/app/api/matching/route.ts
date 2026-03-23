import { NextRequest } from 'next/server';
import * as matchingRepo from '@/lib/db/repositories/matching';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';

const createRequestSchema = z.object({
  action: z.literal('request'),
  title: z.string().min(5, '제목은 5자 이상이어야 합니다').max(200),
  description: z.string().min(10, '설명은 10자 이상이어야 합니다').max(5000),
  category: z.string().min(1),
  urgency: z.enum(['low', 'normal', 'urgent', 'critical']).optional(),
  connection_fee: z.number().min(0).optional(),
  requester_contact: z.record(z.unknown()).optional(),
  location: z.record(z.unknown()).optional(),
});

const acceptSchema = z.object({
  action: z.literal('accept'),
  request_id: z.string().uuid(),
  agent_id: z.string().uuid(),
});

const cancelSchema = z.object({
  action: z.literal('cancel'),
  request_id: z.string().uuid(),
});

const onlineSchema = z.object({
  action: z.literal('online'),
  agent_id: z.string().uuid(),
  categories: z.array(z.string()).min(1, '카테고리를 1개 이상 선택하세요'),
  metadata: z.record(z.unknown()).optional(),
});

const offlineSchema = z.object({
  action: z.literal('offline'),
});

// POST /api/matching
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'request') {
      const parsed = createRequestSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      // Auth optional for requests
      let userId: string | undefined;
      try { userId = requireAuth(request); } catch { /* public request */ }

      const id = await matchingRepo.createRequest({
        requester_id: userId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        urgency: parsed.data.urgency,
        connection_fee: parsed.data.connection_fee,
        requester_contact: parsed.data.requester_contact,
        location: parsed.data.location,
      });
      return apiJson({ data: { id } }, 201);
    }

    if (action === 'accept') {
      const userId = requireAuth(request);
      const parsed = acceptSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      const result = await matchingRepo.acceptRequest(
        parsed.data.request_id,
        userId,
        parsed.data.agent_id,
      );
      return apiJson({ data: result });
    }

    if (action === 'cancel') {
      const userId = requireAuth(request);
      const parsed = cancelSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      await matchingRepo.cancelRequest(parsed.data.request_id, userId);
      return apiJson({ data: { cancelled: true } });
    }

    if (action === 'online') {
      const userId = requireAuth(request);
      const parsed = onlineSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      const id = await matchingRepo.setOnline(
        userId,
        parsed.data.agent_id,
        parsed.data.categories,
        parsed.data.metadata,
      );
      return apiJson({ data: { id } });
    }

    if (action === 'offline') {
      const userId = requireAuth(request);
      const parsed = offlineSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      await matchingRepo.setOffline(userId);
      return apiJson({ data: { offline: true } });
    }

    return apiJson({ error: '지원하지 않는 action입니다' }, 400);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}

// GET /api/matching
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  try {
    const my = searchParams.get('my');

    if (my === 'requests' || my === 'accepted') {
      const userId = requireAuth(request);
      const { limit, offset } = parsePagination(searchParams);

      if (my === 'requests') {
        const result = await matchingRepo.getMyRequests(userId, { limit, offset });
        return apiJson({ data: result.requests, meta: { total: result.total, limit, offset } });
      }
      const result = await matchingRepo.getMyAccepted(userId, { limit, offset });
      return apiJson({ data: result.requests, meta: { total: result.total, limit, offset } });
    }

    // Get single request by id
    const id = searchParams.get('id');
    if (id) {
      const req = await matchingRepo.findById(id);
      if (!req) return apiJson({ error: '매칭 요청을 찾을 수 없습니다' }, 404);
      return apiJson({ data: req });
    }

    // Get online providers
    if (searchParams.get('providers') === 'online') {
      const category = searchParams.get('category') ?? undefined;
      const providers = await matchingRepo.getOnlineProviders(category);
      return apiJson({ data: providers });
    }

    // List waiting requests
    const category = searchParams.get('category') ?? undefined;
    const { limit, offset } = parsePagination(searchParams);
    const result = await matchingRepo.findWaiting({ category, limit, offset });
    return apiJson({ data: result.requests, meta: { total: result.total, limit, offset } });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}
