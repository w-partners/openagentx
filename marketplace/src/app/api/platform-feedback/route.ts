import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError, parsePagination } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as feedbackRepo from '@/lib/db/repositories/platform-feedback';

const createFeedbackSchema = z.object({
  category: z.enum(['feature', 'bug', 'improvement', 'general']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

// GET /api/platform-feedback — list with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawCategory = searchParams.get('category');
    const rawStatus = searchParams.get('status');
    const rawSort = searchParams.get('sort');

    const validCats: feedbackRepo.FeedbackCategory[] = ['feature', 'bug', 'improvement', 'general'];
    const validStatuses: feedbackRepo.FeedbackStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

    const category = rawCategory && (validCats as string[]).includes(rawCategory)
      ? (rawCategory as feedbackRepo.FeedbackCategory)
      : undefined;
    const status = rawStatus && (validStatuses as string[]).includes(rawStatus)
      ? (rawStatus as feedbackRepo.FeedbackStatus)
      : undefined;
    const sort: 'votes' | 'recent' = rawSort === 'recent' ? 'recent' : 'votes';

    const { limit, offset } = parsePagination(searchParams);
    const user = await requireUser(request);

    const result = await feedbackRepo.listFeedback({
      category,
      status,
      sort,
      limit,
      offset,
      viewer_id: user?.userId ?? null,
    });

    return apiJson({
      data: result.items,
      meta: { total: result.total, limit, offset },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}

// POST /api/platform-feedback — create new feedback (auth)
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const body = await request.json();
    const parsed = createFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
    }

    const id = await feedbackRepo.createFeedback({
      user_id: user.userId,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
    });

    return apiJson({ data: { id } }, 201);
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
