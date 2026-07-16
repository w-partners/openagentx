/**
 * GET  /api/dashboard/widgets — 본인 위젯 목록 (월 통계 포함)
 * POST /api/dashboard/widgets — 신규 위젯 등록
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as widgetsRepo from '@/lib/db/repositories/widgets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  agent_slug: z.string().min(1).max(100).optional().nullable(),
  prompt_slug: z.string().min(1).max(100).optional().nullable(),
  cors_origins: z.array(z.string().min(1).max(255)).max(50).optional(),
  welcome_message: z.string().max(2000).optional().nullable(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{3,8}$/).optional(),
  position: z.enum(['bottom-right', 'bottom-left', 'bottom-center']).optional(),
  monthly_quota: z.number().int().min(1).max(1_000_000).optional(),
  inject_page_context: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser(request);
    if (!session) return apiJson({ error: '로그인이 필요합니다' }, 401);
    const widgets = await widgetsRepo.findByOwner(session.userId);
    return apiJson({ data: widgets });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser(request);
    if (!session) return apiJson({ error: '로그인이 필요합니다' }, 401);

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid_input' }, 400);
    }

    const data = parsed.data;
    if (!data.agent_slug && !data.prompt_slug) {
      return apiJson({ error: 'agent_slug 또는 prompt_slug 중 하나는 필수입니다' }, 400);
    }

    const widget = await widgetsRepo.create({
      owner_id: session.userId,
      name: data.name,
      agent_slug: data.agent_slug ?? null,
      prompt_slug: data.prompt_slug ?? null,
      cors_origins: data.cors_origins ?? [],
      welcome_message: data.welcome_message ?? null,
      primary_color: data.primary_color ?? '#0EA5E9',
      position: data.position ?? 'bottom-right',
      monthly_quota: data.monthly_quota ?? 1000,
      inject_page_context: data.inject_page_context ?? true,
    });

    return apiJson({ data: widget }, 201);
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
