/**
 * PATCH  /api/dashboard/widgets/[id] — 위젯 수정
 * DELETE /api/dashboard/widgets/[id] — 위젯 삭제
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as widgetsRepo from '@/lib/db/repositories/widgets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  agent_slug: z.string().min(1).max(100).nullable().optional(),
  prompt_slug: z.string().min(1).max(100).nullable().optional(),
  cors_origins: z.array(z.string().min(1).max(255)).max(50).optional(),
  welcome_message: z.string().max(2000).nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{3,8}$/).optional(),
  position: z.enum(['bottom-right', 'bottom-left', 'bottom-center']).optional(),
  monthly_quota: z.number().int().min(1).max(1_000_000).optional(),
  is_active: z.boolean().optional(),
  inject_page_context: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireUser(request);
    if (!session) return apiJson({ error: '로그인이 필요합니다' }, 401);
    const { id } = await ctx.params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid_input' }, 400);
    }

    const widget = await widgetsRepo.update(id, session.userId, parsed.data);
    if (!widget) return apiJson({ error: '위젯을 찾을 수 없습니다' }, 404);
    return apiJson({ data: widget });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireUser(request);
    if (!session) return apiJson({ error: '로그인이 필요합니다' }, 401);
    const { id } = await ctx.params;
    const ok = await widgetsRepo.remove(id, session.userId);
    if (!ok) return apiJson({ error: '위젯을 찾을 수 없습니다' }, 404);
    return apiJson({ data: { deleted: true } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
