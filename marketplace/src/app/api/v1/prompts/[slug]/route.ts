import { NextRequest, NextResponse } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/prompts/{slug} — 프롬프트 상세
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const p = await promptsRepo.findBySlug(slug);
    if (!p || p.status !== 'active') {
      return apiJson({ error: '프롬프트를 찾을 수 없습니다' }, 404);
    }

    return apiJson({
      data: {
        id: p.id,
        slug: p.slug,
        title: p.title,
        title_ko: p.title_ko,
        description: p.description,
        description_ko: p.description_ko,
        system_prompt: p.system_prompt,
        category: p.category,
        tags: p.tags,
        author_id: p.author_id,
        is_featured: p.is_featured,
        is_public: p.is_public,
        use_count: p.use_count,
        like_count: p.like_count,
        example_input: p.example_input,
        example_output: p.example_output,
        created_at: p.created_at,
        updated_at: p.updated_at,
      },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
