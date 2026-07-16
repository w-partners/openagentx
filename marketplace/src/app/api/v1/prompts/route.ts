import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey, hasScope } from '@/lib/auth/api-key-auth';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/prompts — 프롬프트 목록 (공개)
 * query: q, category, limit, offset
 * 인증 선택. Bearer 가 있으면 검증하지만 없어도 200.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get('q') ?? undefined;
    const category = sp.get('category') ?? undefined;
    const limit = Math.min(parseInt(sp.get('limit') ?? '20', 10) || 20, 100);
    const offset = Math.max(parseInt(sp.get('offset') ?? '0', 10) || 0, 0);

    const { prompts, total } = await promptsRepo.findAll({
      q,
      category,
      is_public: true,
      limit,
      offset,
    });

    const data = prompts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      title_ko: p.title_ko,
      description: p.description,
      description_ko: p.description_ko,
      category: p.category,
      tags: p.tags,
      is_featured: p.is_featured,
      use_count: p.use_count,
      like_count: p.like_count,
      author_id: p.author_id,
      created_at: p.created_at,
    }));

    return apiJson({ data, meta: { total, limit, offset } });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

const createSchema = z.object({
  slug: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200),
  title_ko: z.string().max(200).optional(),
  description: z.string().min(1),
  description_ko: z.string().optional(),
  system_prompt: z.string().min(1),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).max(20).optional(),
  example_input: z.string().optional(),
  example_output: z.string().optional(),
  is_public: z.boolean().optional(),
});

/**
 * POST /api/v1/prompts — 새 프롬프트 등록 (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid) {
      return apiJson({ error: '인증이 필요합니다 (Bearer oax_* 또는 OAuth)' }, 401);
    }
    if (!hasScope(auth, 'prompts:write')) {
      return apiJson({ error: 'prompts:write 스코프가 필요합니다' }, 403);
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, 400);
    }

    const created = await promptsRepo.create({
      ...parsed.data,
      author_id: auth.userId,
    });

    return apiJson(
      {
        data: {
          id: created.id,
          slug: created.slug,
          title: created.title,
          category: created.category,
        },
      },
      201,
    );
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
