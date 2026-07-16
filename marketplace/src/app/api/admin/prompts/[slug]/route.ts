import { NextRequest } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireAdmin } from '@/lib/auth/require-admin';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/prompts/{slug} — admin update (featured/public/status etc)
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    await requireAdmin(request);
    const { slug } = await ctx.params;
    const body = await request.json();

    const allowedFields = [
      'title', 'title_ko', 'description', 'description_ko', 'system_prompt',
      'category', 'tags', 'example_input', 'example_output',
      'is_featured', 'is_public', 'status',
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const k of allowedFields) {
      if (body[k] !== undefined) updates[k] = body[k];
    }

    const updated = await promptsRepo.updateBySlug(slug, updates as never);
    if (!updated) return apiJson({ error: 'not found' }, 404);

    return apiJson({ data: updated });
  } catch (err) {
    return apiCatchError(err, 403);
  }
}

/**
 * DELETE /api/admin/prompts/{slug}
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    await requireAdmin(request);
    const { slug } = await ctx.params;
    const ok = await promptsRepo.deleteBySlug(slug);
    if (!ok) return apiJson({ error: 'not found' }, 404);
    return apiJson({ data: { deleted: true } });
  } catch (err) {
    return apiCatchError(err, 403);
  }
}
