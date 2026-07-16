import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import * as promptsRepo from '@/lib/db/repositories/prompts';
import { runClaude } from '@/lib/partner/claude-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 클로드 호출은 길 수 있어 timeout 늘림
export const maxDuration = 300;

const runSchema = z.object({
  input: z.string().min(1).max(20_000),
  model: z.enum(['sonnet', 'opus', 'haiku']).optional(),
});

/**
 * POST /api/prompts/{slug}/run — 웹 UI 전용 프롬프트 실행 (세션쿠키 인증)
 * - 외부 API 와 분리: /api/v1/prompts/* 는 Bearer oax_*, 본 엔드포인트는 access_token 쿠키.
 * - "💬 빠른 실행" 버튼 등 로그인된 마스터 사용자가 즉시 사용.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const startedAt = Date.now();

  try {
    const { slug } = await ctx.params;

    const session = await requireUser(request);
    if (!session) {
      return apiJson({ error: '로그인이 필요합니다' }, 401);
    }

    const prompt = await promptsRepo.findBySlug(slug);
    if (!prompt || prompt.status !== 'active') {
      return apiJson({ error: '프롬프트를 찾을 수 없습니다' }, 404);
    }
    if (!prompt.is_public && prompt.author_id !== session.userId) {
      return apiJson({ error: '비공개 프롬프트입니다' }, 403);
    }

    const body = await request.json();
    const parsed = runSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, 400);
    }

    let output = '';
    let runStatus: 'success' | 'failed' = 'success';
    let errorMsg: string | null = null;

    try {
      output = await runClaude({
        systemPrompt: prompt.system_prompt,
        input: parsed.data.input,
        model: parsed.data.model ?? 'sonnet',
        maxTurns: 1,
        timeoutMs: 240_000,
      });
    } catch (e) {
      runStatus = 'failed';
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    const duration = Date.now() - startedAt;

    const runId = await promptsRepo.logRun({
      prompt_id: prompt.id,
      user_id: session.userId,
      input_text: parsed.data.input,
      output_text: output || null,
      status: runStatus,
      error_msg: errorMsg,
      duration_ms: duration,
    });

    if (runStatus === 'success') {
      await promptsRepo.incrementUseCount(prompt.id).catch(() => {});
    }

    if (runStatus === 'failed') {
      return apiJson(
        { error: errorMsg ?? '실행 실패', data: { run_id: runId, duration_ms: duration } },
        502,
      );
    }

    return apiJson({
      data: {
        run_id: runId,
        slug: prompt.slug,
        output,
        duration_ms: duration,
      },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
