import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError, parsePagination } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import { createRequest, findAll } from '@/lib/db/repositories/agent-requests';

const CreateRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.string().default('general'),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  source_urls: z.array(z.string().url()).optional().default([]),
  attachments: z
    .array(
      z.object({
        type: z.enum(['md', 'html', 'pdf', 'image', 'other']),
        url: z.string().url(),
        name: z.string(),
      }),
    )
    .optional()
    .default([]),
});

/**
 * POST /api/agent-requests
 * 에이전트 제작 요청 생성
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const body = await request.json();
    const parsed = CreateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
    }

    const input = parsed.data;
    const id = await createRequest({
      requester_id: user.userId,
      title: input.title,
      description: input.description,
      category: input.category,
      urgency: input.urgency,
      source_urls: input.source_urls,
      attachments: input.attachments,
    });

    // 비동기로 Discord 알림 (실패해도 무시)
    const BOT = 'MTQ4NDYxNTE3NjM4Nzk1NjgzNw.GAdcn_.0PMhwZ3KTZ7gJbYeFLSWfTPFqImSFyEyzVxfe8';
    fetch('https://discord.com/api/v10/channels/1486732103910690928/messages', {
      method: 'POST',
      headers: { 'Authorization': `Bot ${BOT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `📋 **새 에이전트 제작 요청**: ${input.title}\n카테고리: ${input.category} | 긴급도: ${input.urgency}\nURL: ${input.source_urls?.join(', ') || '없음'}` }),
    }).catch(() => {});

    return apiJson({ data: { id } }, 201);
  } catch (err) {
    return apiCatchError(err, 500);
  }
}

/**
 * GET /api/agent-requests
 * 내 요청 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return apiJson({ error: '인증이 필요합니다' }, 401);

    const { limit, offset } = parsePagination(request.nextUrl.searchParams);
    const status = request.nextUrl.searchParams.get('status') ?? undefined;

    const { requests, total } = await findAll({
      requester_id: user.userId,
      status,
      limit,
      offset,
    });

    return apiJson({ data: requests, meta: { total } });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
