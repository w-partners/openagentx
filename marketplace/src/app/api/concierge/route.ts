import { NextRequest } from 'next/server';
import { chatWithConcierge } from '@/lib/ai/concierge';
import { z } from 'zod';
import { apiJson, apiError } from '@/lib/utils/api-response';

const chatSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
  type: z.enum(['guide', 'recommend', 'build_agent', 'faq']).optional(),
});

// POST /api/concierge — Chat with concierge
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') ?? undefined;

  const body = await request.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  try {
    const response = await chatWithConcierge(
      parsed.data.sessionId,
      parsed.data.message,
      userId,
      parsed.data.type ?? 'guide',
    );

    return apiJson({ data: { response } });
  } catch {
    return apiError('컨시어지 서비스를 이용할 수 없습니다', 500);
  }
}
