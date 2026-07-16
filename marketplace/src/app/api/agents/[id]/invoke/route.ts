/**
 * POST /api/agents/[id]/invoke
 *
 * 등록된 에이전트를 실행한다.
 * - agents.metadata.system_prompt 또는 description 을 시스템 프롬프트로 사용
 * - runClaude 로 실행 (시간 측정)
 * - agent_cases 에 input/output/duration 자동 기록
 *
 * Body:
 *   { input: string, service_id?: string, options?: { max_turns?: number } }
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/pool';
import { runClaude } from '@/lib/partner/claude-runner';
import { apiJson, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  input: z.string().min(1).max(50_000),
  service_id: z.string().uuid().optional(),
  options: z
    .object({
      max_turns: z.number().int().min(1).max(20).optional(),
    })
    .optional(),
});

interface AgentRow {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, unknown> | null;
  status: string;
}

interface ServiceRow {
  id: string;
  name: string;
  is_active: boolean;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  let agentId = '';
  let userId = '';
  let serviceId: string | null = null;
  let inputText = '';
  const start = Date.now();

  try {
    userId = requireAuth(request);
    const { id } = await ctx.params;
    agentId = id;

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }
    inputText = parsed.data.input;
    const explicitService = parsed.data.service_id;
    const maxTurns = parsed.data.options?.max_turns ?? 5;

    // Agent 조회
    const agentRes = await query<AgentRow>(
      'SELECT id, name, description, metadata, status FROM agents WHERE id = $1',
      [agentId],
    );
    const agent = agentRes.rows[0];
    if (!agent) {
      return apiJson({ error: '에이전트를 찾을 수 없습니다' }, 404);
    }

    // service 결정
    if (explicitService) {
      const svcRes = await query<ServiceRow>(
        'SELECT id, name, is_active FROM agent_services WHERE id = $1 AND agent_id = $2',
        [explicitService, agentId],
      );
      if (svcRes.rows.length === 0) {
        return apiJson({ error: '지정한 service_id 가 이 에이전트에 없습니다' }, 404);
      }
      serviceId = svcRes.rows[0].id;
    } else {
      const svcRes = await query<ServiceRow>(
        `SELECT id, name, is_active
           FROM agent_services
          WHERE agent_id = $1 AND is_active = TRUE
          ORDER BY created_at ASC
          LIMIT 1`,
        [agentId],
      );
      serviceId = svcRes.rows[0]?.id ?? null;
    }

    // system_prompt 결정
    const md = agent.metadata ?? {};
    const systemPrompt =
      (typeof (md as Record<string, unknown>).system_prompt === 'string'
        ? ((md as Record<string, unknown>).system_prompt as string)
        : '') ||
      `당신은 "${agent.name}" 입니다. ${agent.description}\n한국어로 전문적이고 실용적으로 답변하세요.`;

    // 실행
    const output = await runClaude({
      systemPrompt,
      input: inputText,
      model: 'sonnet',
      maxTurns,
      timeoutMs: 180_000,
    });

    const duration = Date.now() - start;

    // 케이스 INSERT
    const caseRes = await query<{ id: string }>(
      `INSERT INTO agent_cases
         (agent_id, user_id, service_id, input_text, output_text,
          status, tokens_used, duration_ms, metadata)
       VALUES ($1, $2, $3, $4, $5, 'success', $6, $7, $8::jsonb)
       RETURNING id`,
      [
        agentId,
        userId,
        serviceId,
        inputText,
        output,
        null,
        duration,
        JSON.stringify({ model: 'sonnet', max_turns: maxTurns }),
      ],
    );

    return apiJson({
      data: {
        case_id: caseRes.rows[0].id,
        output,
        tokens_used: null,
        duration_ms: duration,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);

    // 실패 케이스도 기록 (베스트 에포트)
    const duration = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);
    const status = /timeout|timed out/i.test(errMsg) ? 'timeout' : 'error';
    if (agentId && userId) {
      try {
        await query(
          `INSERT INTO agent_cases
             (agent_id, user_id, service_id, input_text, output_text,
              status, error_msg, duration_ms)
           VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)`,
          [agentId, userId, serviceId, inputText, status, errMsg.slice(0, 2000), duration],
        );
      } catch {
        /* swallow logging error */
      }
    }
    return apiCatchError(err, 500);
  }
}
