import { NextRequest } from 'next/server';
import { apiJson } from '@/lib/utils/api-response';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/prompts/lookup?slug=<slug> — 챗 통합용 system_prompt 조회
 * 응답: { data: { slug, title, description, system_prompt, source: 'db' | 'unknown' } }
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return apiJson({ error: 'slug 파라미터가 필요합니다' }, 400);

  try {
    const p = await promptsRepo.findBySlug(slug);
    if (p && p.status === 'active' && p.is_public) {
      return apiJson({
        data: {
          id: p.id,
          slug: p.slug,
          title: p.title,
          name: p.title_ko ?? p.title,
          description: p.description_ko ?? p.description,
          system_prompt: p.system_prompt,
          source: 'db',
        },
      });
    }
  } catch {
    // ignore
  }

  return apiJson({
    data: { slug, name: slug, description: undefined, system_prompt: undefined, source: 'unknown' },
  });
}
