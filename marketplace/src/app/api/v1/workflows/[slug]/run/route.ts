import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey, hasScope } from '@/lib/auth/api-key-auth';
import * as workflowsRepo from '@/lib/db/repositories/workflows';
import { executeWorkflow } from '@/lib/workflows/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Workflow may chain multiple Claude calls — give it room.
export const maxDuration = 300;

const runSchema = z.object({
  input: z.string().min(1).max(20_000),
});

/**
 * POST /api/v1/workflows/{slug}/run
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '인증이 필요합니다 (Bearer oax_* 또는 OAuth)' }, 401);
    }
    if (!hasScope(auth, 'workflows:execute')) {
      return apiJson({ error: 'workflows:execute 스코프가 필요합니다' }, 403);
    }

    const wf = await workflowsRepo.findBySlug(slug);
    if (!wf) return apiJson({ error: '워크플로우를 찾을 수 없습니다' }, 404);
    if (!wf.is_public && wf.owner_id !== auth.userId) {
      return apiJson({ error: '비공개 워크플로우입니다' }, 403);
    }

    const body = await request.json();
    const parsed = runSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, 400);
    }

    const result = await executeWorkflow(wf.id, auth.userId, parsed.data.input);

    if (result.status === 'error') {
      return apiJson(
        {
          error: '워크플로우 실행 실패',
          data: {
            run_id: result.runId,
            step_results: result.stepResults,
            duration_ms: result.total_duration_ms,
          },
        },
        502,
      );
    }

    return apiJson({
      data: {
        run_id: result.runId,
        slug: wf.slug,
        output: result.output,
        step_results: result.stepResults,
        duration_ms: result.total_duration_ms,
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
