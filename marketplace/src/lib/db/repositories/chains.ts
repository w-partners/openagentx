import { query, transaction } from '../pool';
import type { PoolClient } from 'pg';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants';
import { notifySafe } from '../../telegram/notifications';

// --- Types ---

export type ChainStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type StepType = 'fixed' | 'auction' | 'matching' | 'fulfill';

export interface ChainStep {
  name: string;
  type: StepType;
  category: string;
  description: string;
  auto_trigger: boolean;
  config: {
    agent_id?: string;
    search_query?: string;
    max_price?: number;
    timeout_minutes?: number;
    urgency?: string;
    connection_fee?: number;
  };
}

export interface ChainFlow {
  id: string;
  creator_id: string | null;
  name: string;
  description: string | null;
  category: string;
  steps: ChainStep[];
  is_public: boolean;
  total_uses: number;
  created_at: Date;
  tags: string[];
  is_featured: boolean;
}

export interface ChainInstance {
  id: string;
  flow_id: string;
  requester_id: string | null;
  input_data: Record<string, unknown>;
  current_step: number;
  status: ChainStatus;
  step_results: StepResult[];
  total_cost: number;
  started_at: Date;
  completed_at: Date | null;
  error_message: string | null;
  // Joined
  flow_name?: string;
  flow_category?: string;
  flow_steps?: ChainStep[];
}

export interface StepResult {
  step_index: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  job_id?: string;
  auction_id?: string;
  matching_id?: string;
  result_data?: Record<string, unknown>;
  cost?: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

// --- Repository ---

export async function createFlow(
  creatorId: string | null,
  name: string,
  description: string | null,
  category: string,
  steps: ChainStep[],
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO chain_flows (creator_id, name, description, category, steps)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [creatorId, name, description, category, JSON.stringify(steps)],
  );
  return result.rows[0].id;
}

export async function findFlows(
  category?: string,
  filters?: { limit?: number; offset?: number },
): Promise<{ flows: ChainFlow[]; total: number }> {
  const conditions = ['is_public = TRUE'];
  const values: unknown[] = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    values.push(category);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<ChainFlow>(
      `SELECT * FROM chain_flows ${where} ORDER BY total_uses DESC, created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM chain_flows ${where}`,
      values,
    ),
  ]);

  return {
    flows: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findFlowById(id: string): Promise<ChainFlow | null> {
  const result = await query<ChainFlow>(
    'SELECT * FROM chain_flows WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findFeaturedFlows(limit: number = 6): Promise<ChainFlow[]> {
  const result = await query<ChainFlow>(
    `SELECT * FROM chain_flows
     WHERE is_public = TRUE AND is_featured = TRUE
     ORDER BY total_uses DESC, created_at DESC
     LIMIT $1`,
    [Math.min(limit, MAX_PAGE_SIZE)],
  );
  return result.rows;
}

export async function startChain(
  flowId: string,
  requesterId: string | null,
  inputData: Record<string, unknown>,
): Promise<string> {
  return await transaction(async (client: PoolClient) => {
    // Verify flow exists
    const flowResult = await client.query<ChainFlow>(
      'SELECT * FROM chain_flows WHERE id = $1',
      [flowId],
    );
    if (flowResult.rows.length === 0) {
      throw new Error('체인 플로우를 찾을 수 없습니다');
    }

    const flow = flowResult.rows[0];
    const steps = typeof flow.steps === 'string' ? JSON.parse(flow.steps) : flow.steps;
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('체인에 단계가 없습니다');
    }

    // Initialize step_results with pending status for each step
    const stepResults: StepResult[] = steps.map((_: ChainStep, i: number) => ({
      step_index: i,
      status: i === 0 ? 'running' as const : 'pending' as const,
      started_at: i === 0 ? new Date().toISOString() : undefined,
    }));

    const result = await client.query<{ id: string }>(
      `INSERT INTO chain_instances (flow_id, requester_id, input_data, current_step, status, step_results)
       VALUES ($1, $2, $3, 0, 'running', $4)
       RETURNING id`,
      [flowId, requesterId, JSON.stringify(inputData), JSON.stringify(stepResults)],
    );

    // Increment total_uses
    await client.query(
      'UPDATE chain_flows SET total_uses = total_uses + 1 WHERE id = $1',
      [flowId],
    );

    return result.rows[0].id;
  });
}

export async function completeStep(
  instanceId: string,
  stepIndex: number,
  result: Record<string, unknown>,
  cost?: number,
): Promise<{ hasMore: boolean; autoTrigger: boolean }> {
  return await transaction(async (client: PoolClient) => {
    const instResult = await client.query<ChainInstance & { flow_steps_raw: string }>(
      `SELECT ci.*, cf.steps AS flow_steps_raw
       FROM chain_instances ci
       JOIN chain_flows cf ON cf.id = ci.flow_id
       WHERE ci.id = $1 AND ci.status = 'running'
       FOR UPDATE`,
      [instanceId],
    );
    if (instResult.rows.length === 0) {
      throw new Error('실행 중인 체인 인스턴스를 찾을 수 없습니다');
    }

    const instance = instResult.rows[0];
    const flowSteps: ChainStep[] = typeof instance.flow_steps_raw === 'string'
      ? JSON.parse(instance.flow_steps_raw)
      : instance.flow_steps_raw;
    const stepResults: StepResult[] = typeof instance.step_results === 'string'
      ? JSON.parse(instance.step_results as unknown as string)
      : instance.step_results;

    // Update step result
    if (stepResults[stepIndex]) {
      stepResults[stepIndex].status = 'completed';
      stepResults[stepIndex].result_data = result;
      stepResults[stepIndex].cost = cost ?? 0;
      stepResults[stepIndex].completed_at = new Date().toISOString();
    }

    const totalCost = parseFloat(String(instance.total_cost)) + (cost ?? 0);
    const hasMore = stepIndex + 1 < flowSteps.length;
    const autoTrigger = hasMore && (flowSteps[stepIndex + 1]?.auto_trigger ?? false);

    if (hasMore) {
      // Move to next step
      await client.query(
        `UPDATE chain_instances SET current_step = $1, step_results = $2, total_cost = $3 WHERE id = $4`,
        [stepIndex + 1, JSON.stringify(stepResults), totalCost, instanceId],
      );
    } else {
      // Chain completed
      await client.query(
        `UPDATE chain_instances SET status = 'completed', step_results = $1, total_cost = $2, completed_at = NOW() WHERE id = $3`,
        [JSON.stringify(stepResults), totalCost, instanceId],
      );
    }

    // Notify chain requester about step completion
    if (instance.requester_id) {
      const flowName = (await client.query<{ name: string }>(
        'SELECT name FROM chain_flows WHERE id = $1',
        [instance.flow_id],
      )).rows[0]?.name ?? '체인';

      const currentStep = flowSteps[stepIndex];
      notifySafe(instance.requester_id, {
        type: 'chain_step',
        chainName: flowName,
        stepName: currentStep?.name ?? `단계 ${stepIndex + 1}`,
        stepIndex,
        status: hasMore ? 'completed' : 'completed',
      });
    }

    return { hasMore, autoTrigger };
  });
}

export async function advanceChain(instanceId: string): Promise<ChainInstance | null> {
  const result = await query<ChainInstance & { flow_steps_raw: string }>(
    `SELECT ci.*, cf.steps AS flow_steps_raw, cf.name AS flow_name, cf.category AS flow_category
     FROM chain_instances ci
     JOIN chain_flows cf ON cf.id = ci.flow_id
     WHERE ci.id = $1 AND ci.status = 'running'`,
    [instanceId],
  );
  if (result.rows.length === 0) return null;

  const instance = result.rows[0];
  const flowSteps: ChainStep[] = typeof instance.flow_steps_raw === 'string'
    ? JSON.parse(instance.flow_steps_raw)
    : instance.flow_steps_raw;

  // Mark current step as running
  const stepResults: StepResult[] = typeof instance.step_results === 'string'
    ? JSON.parse(instance.step_results as unknown as string)
    : instance.step_results;

  if (stepResults[instance.current_step]) {
    stepResults[instance.current_step].status = 'running';
    stepResults[instance.current_step].started_at = new Date().toISOString();
  }

  await query(
    'UPDATE chain_instances SET step_results = $1 WHERE id = $2',
    [JSON.stringify(stepResults), instanceId],
  );

  return { ...instance, flow_steps: flowSteps, step_results: stepResults };
}

export async function failChain(instanceId: string, error: string): Promise<void> {
  await query(
    `UPDATE chain_instances SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
    [error, instanceId],
  );
}

export async function getMyChains(
  userId: string,
  filters?: { limit?: number; offset?: number },
): Promise<{ instances: ChainInstance[]; total: number }> {
  const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = filters?.offset ?? 0;

  const [dataResult, countResult] = await Promise.all([
    query<ChainInstance>(
      `SELECT ci.*, cf.name AS flow_name, cf.category AS flow_category, cf.steps AS flow_steps
       FROM chain_instances ci
       JOIN chain_flows cf ON cf.id = ci.flow_id
       WHERE ci.requester_id = $1
       ORDER BY ci.started_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM chain_instances WHERE requester_id = $1',
      [userId],
    ),
  ]);

  return {
    instances: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function getChainStatus(instanceId: string): Promise<ChainInstance | null> {
  const result = await query<ChainInstance>(
    `SELECT ci.*, cf.name AS flow_name, cf.category AS flow_category, cf.steps AS flow_steps
     FROM chain_instances ci
     JOIN chain_flows cf ON cf.id = ci.flow_id
     WHERE ci.id = $1`,
    [instanceId],
  );
  return result.rows[0] ?? null;
}
