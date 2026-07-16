import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey, hasScope } from '@/lib/auth/api-key-auth';
import * as promptsRepo from '@/lib/db/repositories/prompts';
import { runClaude } from '@/lib/partner/claude-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 클로드 호출은 길 수 있어 timeout 늘림
export const maxDuration = 300;

const runSchema = z.object({
  input: z.string().min(1).max(20_000),
  /** 모델 오버라이드 (sonnet/opus/haiku). 기본 sonnet */
  model: z.enum(['sonnet', 'opus', 'haiku']).optional(),
});

/**
 * POST /api/v1/prompts/{slug}/run — 프롬프트 실행
 * - 인증 필수 (Bearer oax_* 또는 OAuth)
 * - prompts:execute scope (OAuth provider 토큰 한정)
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const startedAt = Date.now();

  try {
    const { slug } = await ctx.params;

    const auth = await validateUserApiKey(request);
    if (!auth.valid) {
      return apiJson({ error: '인증이 필요합니다 (Bearer oax_* 또는 OAuth)' }, 401);
    }
    if (!hasScope(auth, 'prompts:execute')) {
      return apiJson({ error: 'prompts:execute 스코프가 필요합니다' }, 403);
    }

    const prompt = await promptsRepo.findBySlug(slug);
    if (!prompt || prompt.status !== 'active') {
      return apiJson({ error: '프롬프트를 찾을 수 없습니다' }, 404);
    }
    if (!prompt.is_public && prompt.author_id !== auth.userId) {
      return apiJson({ error: '비공개 프롬프트입니다' }, 403);
    }

    const body = await request.json();
    const parsed = runSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, 400);
    }

    let output: string;
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
      output = '';
    }

    const duration = Date.now() - startedAt;

    // log + increment counter (best-effort, no transaction needed)
    const runId = await promptsRepo.logRun({
      prompt_id: prompt.id,
      user_id: auth.userId ?? null,
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
