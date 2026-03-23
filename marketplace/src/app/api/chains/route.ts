import { NextRequest } from 'next/server';
import * as chainsRepo from '@/lib/db/repositories/chains';
import { executeStep, onStepComplete } from '@/lib/chains/executor';
import { z } from 'zod';
import { apiJson, apiCatchError, requireAuth, AuthError, parsePagination } from '@/lib/utils/api-response';

const stepSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['fixed', 'auction', 'matching', 'fulfill']),
  category: z.string().min(1),
  description: z.string().min(1).max(2000),
  auto_trigger: z.boolean().default(true),
  config: z.object({
    agent_id: z.string().uuid().optional(),
    search_query: z.string().optional(),
    max_price: z.number().positive().optional(),
    timeout_minutes: z.number().positive().optional(),
    urgency: z.string().optional(),
    connection_fee: z.number().min(0).optional(),
  }).default({}),
});

const createFlowSchema = z.object({
  action: z.literal('create-flow'),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다').max(200),
  description: z.string().max(5000).optional(),
  category: z.string().min(1),
  steps: z.array(stepSchema).min(2, '체인에는 최소 2개의 단계가 필요합니다').max(20),
});

const startChainSchema = z.object({
  action: z.literal('start'),
  flow_id: z.string().uuid(),
  input_data: z.record(z.unknown()).optional(),
});

const stepCompleteSchema = z.object({
  action: z.literal('step-complete'),
  instance_id: z.string().uuid(),
  step_index: z.number().int().min(0),
  result: z.record(z.unknown()),
  cost: z.number().min(0).optional(),
});

// POST /api/chains
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'create-flow') {
      const parsed = createFlowSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      let userId: string | null = null;
      try { userId = requireAuth(request); } catch { /* public */ }

      const id = await chainsRepo.createFlow(
        userId,
        parsed.data.name,
        parsed.data.description ?? null,
        parsed.data.category,
        parsed.data.steps,
      );
      return apiJson({ data: { id } }, 201);
    }

    if (action === 'start') {
      const parsed = startChainSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      let userId: string | null = null;
      try { userId = requireAuth(request); } catch { /* public */ }

      const instanceId = await chainsRepo.startChain(
        parsed.data.flow_id,
        userId,
        parsed.data.input_data ?? {},
      );

      // 첫 번째 스텝 실행
      try {
        const instance = await chainsRepo.advanceChain(instanceId);
        if (instance && instance.flow_steps) {
          const firstStep = instance.flow_steps[0];
          if (firstStep) {
            await executeStep(instance, firstStep, 0);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await chainsRepo.failChain(instanceId, `첫 번째 스텝 실행 실패: ${errMsg}`);
      }

      return apiJson({ data: { id: instanceId } }, 201);
    }

    if (action === 'step-complete') {
      const parsed = stepCompleteSchema.safeParse(body);
      if (!parsed.success) return apiJson({ error: parsed.error.issues[0].message }, 400);

      await onStepComplete(
        parsed.data.instance_id,
        parsed.data.step_index,
        parsed.data.result,
        parsed.data.cost,
      );
      return apiJson({ data: { completed: true } });
    }

    return apiJson({ error: '지원하지 않는 action입니다' }, 400);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}

// GET /api/chains
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  try {
    // List flows
    if (searchParams.get('flows') === 'true') {
      const category = searchParams.get('category') ?? undefined;
      const { limit, offset } = parsePagination(searchParams);
      const result = await chainsRepo.findFlows(category, { limit, offset });
      return apiJson({ data: result.flows, meta: { total: result.total, limit, offset } });
    }

    // My chains
    if (searchParams.get('my') === 'true') {
      const userId = requireAuth(request);
      const { limit, offset } = parsePagination(searchParams);
      const result = await chainsRepo.getMyChains(userId, { limit, offset });
      return apiJson({ data: result.instances, meta: { total: result.total, limit, offset } });
    }

    // Single chain instance or flow
    const id = searchParams.get('id');
    if (id) {
      // Try as instance first, then as flow
      const instance = await chainsRepo.getChainStatus(id);
      if (instance) return apiJson({ data: instance, type: 'instance' });

      const flow = await chainsRepo.findFlowById(id);
      if (flow) return apiJson({ data: flow, type: 'flow' });

      return apiJson({ error: '체인을 찾을 수 없습니다' }, 404);
    }

    // Default: list all public flows
    const category = searchParams.get('category') ?? undefined;
    const { limit, offset } = parsePagination(searchParams);
    const result = await chainsRepo.findFlows(category, { limit, offset });
    return apiJson({ data: result.flows, meta: { total: result.total, limit, offset } });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}
